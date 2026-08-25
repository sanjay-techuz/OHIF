/**
 * @author Sanjay Balai
 *
 * [CROSS-REF-POINT] Cross Reference Point — a single, draggable circle that marks
 * ONE 3D location shared across the MR hanging-protocol panes (axial / sagittal /
 * coronal). Dragging it in any pane re-navigates every OTHER pane to the slice that
 * passes through that point and redraws the circle there.
 *
 * This is intentionally NOT a measurement:
 *   - it is a Cornerstone annotation tool WITHOUT a MeasurementService mapping, so
 *     it is never saved to the backend, listed in the measurement panel, or scored
 *     in the student/faculty evaluation. It is a pure navigation aid.
 *   - it does not touch the built-in `Crosshairs` tool (which is MPR/volume-only);
 *     this is a separate, custom feature for our STACK viewports.
 *
 * Why it works across flips/tilt for free: positions are drawn with
 * `viewport.worldToCanvas()` and read with `canvasToWorld()`, which already bake in
 * the camera's flipHorizontal / flipVertical / rotation / zoom / pan — so a flipped
 * axial still shows the point at the correct anatomical spot, and the same holds for
 * sagittal↔coronal↔axial.
 *
 * "Hide when scrolled off": the point renders only where it is on (near) the current
 * slice — Cornerstone's default annotation slice-culling (`isAnnotationVisible`)
 * gives us that automatically. Scroll a pane away and its circle disappears until the
 * point is dragged again (which re-syncs all panes) or the pane scrolls back.
 *
 * REVERT: delete this file + `CrossReferencePointButton.tsx`, and remove the
 * `[CROSS-REF-POINT]` tagged lines in `initCornerstoneTools.js`,
 * `getToolbarModule.tsx`, `initToolGroups.js`, `useViewportLinkStore.ts`, and the
 * two `modes/longitudinal` files.
 */
import {
  getEnabledElement,
  getEnabledElementByViewportId,
  metaData,
  utilities as csCoreUtilities,
  Enums as CoreEnums,
  type Types as CoreTypes,
} from '@cornerstonejs/core';
import { AnnotationTool, annotation, drawing, utilities as csToolsUtilities, Enums, state as csToolsState } from '@cornerstonejs/tools';
import { vec2 } from 'gl-matrix';

const { addAnnotation, getAnnotations, removeAnnotation } = annotation.state;
const { isAnnotationVisible } = annotation.visibility;
const { triggerAnnotationRenderForViewportIds } = csToolsUtilities;
const { getClosestStackImageIndexForPoint } = csCoreUtilities;
const { Events } = Enums;

const TOOL_NAME = 'CrossReferencePoint';

// On-screen marker = the same green target reticle as the toolbar icon.
const RETICLE_COLOR = 'rgb(50, 215, 50)';
// Red = "not applicable here": the point is in the OTHER breast from the sagittal
// view being shown (a right-breast point can't apply to the left sagittal, etc.).
const RETICLE_RED = 'rgb(255, 66, 66)';
const RETICLE = {
  tickInner: 4, // ticks span from this radius (leaves a hollow centre)…
  tickOuter: 13, // …to this radius
  lineWidth: 2,
};

// Build the reticle as polyline sub-arrays — four inward ticks at N/E/S/W with an
// empty centre (no ring, no centre dot) — for a single drawPath call, centred on
// (cx, cy) in canvas pixels.
function buildReticleSubArrays(cx: number, cy: number): number[][][] {
  const { tickInner, tickOuter } = RETICLE;
  return [
    [[cx, cy - tickOuter], [cx, cy - tickInner]], // top
    [[cx, cy + tickInner], [cx, cy + tickOuter]], // bottom
    [[cx - tickOuter, cy], [cx - tickInner, cy]], // left
    [[cx + tickInner, cy], [cx + tickOuter, cy]], // right
  ];
}

type Vec3 = [number, number, number];

// Relationship between a world point's breast side and the sagittal view shown by a
// viewport. LPS world coords: +X = patient Left, −X = patient Right (matches the MR
// classifier's `sagittalSide`). A sagittal viewport shows a single breast (its slice
// X sign); an axial/coronal view shows both, so it is never a mismatch ('na').
//   'match'    → same breast → normal (green)
//   'mismatch' → sagittal view of the OPPOSITE breast → not applicable (red)
//   'na'       → not a sagittal view
function pointSagittalRelation(
  viewport: CoreTypes.IViewport,
  point: Vec3
): 'match' | 'mismatch' | 'na' {
  const camera = (viewport as unknown as { getCamera?: () => { viewPlaneNormal?: number[]; focalPoint?: number[] } }).getCamera?.();
  const n = camera?.viewPlaneNormal;
  const fp = camera?.focalPoint;
  if (!n || !fp) {
    return 'na';
  }
  const a = [Math.abs(n[0]), Math.abs(n[1]), Math.abs(n[2])];
  const isSagittal = a[0] >= a[1] && a[0] >= a[2] && a[0] > 0.75; // X-dominant normal
  if (!isSagittal) {
    return 'na';
  }
  const viewportSide = fp[0] < 0 ? 'R' : 'L'; // the breast this sagittal slice shows
  const pointSide = point[0] < 0 ? 'R' : 'L';
  return viewportSide === pointSide ? 'match' : 'mismatch';
}

// A stack viewport is one that exposes setImageIdIndex/getImageIds — the MR panes.
const isStackViewport = (
  vp: unknown
): vp is CoreTypes.IStackViewport =>
  !!vp &&
  typeof (vp as { setImageIdIndex?: unknown }).setImageIdIndex === 'function' &&
  typeof (vp as { getImageIds?: unknown }).getImageIds === 'function';

class CrossReferencePointTool extends AnnotationTool {
  static toolName = TOOL_NAME;

  editData: {
    annotation: Record<string, unknown>;
    viewportIdsToRender: string[];
  } | null = null;

  isDrawing = false;

  constructor(
    toolProps = {},
    defaultToolProps = {
      supportedInteractionTypes: ['Mouse', 'Touch'],
      configuration: {
        // circle radius on screen (px) and its outline width.
        pointRadius: 6,
        // slop (px) for grabbing the circle with the mouse.
        proximity: 14,
      },
    }
  ) {
    super(toolProps, defaultToolProps);
  }

  // We never create points by clicking — the toolbar toggle places exactly one
  // point programmatically (see placeCrossReferencePoint). Keep a no-op so an
  // accidental active-mode click cannot spawn extra points.
  addNewAnnotation = () => {
    return undefined as unknown as Record<string, unknown>;
  };

  // POSITION-BASED slice culling (this is the crux of cross-plane display).
  //
  // The stock filter keeps a stack annotation only on its `referencedImageId` — the
  // exact image it was drawn on — which would hide our point in every OTHER series
  // (coronal/sagittal are different acquisitions). Instead we keep the point on a
  // pane only when the pane's CURRENT slice is the one closest to the point in 3D.
  // So the circle appears in whichever axial/sagittal/coronal pane is showing the
  // slice through the point, and disappears when a pane is scrolled away — exactly
  // the "hide on that pane" behaviour.
  filterInteractableAnnotationsForElement(element: HTMLElement, annotations: Array<Record<string, unknown>>) {
    if (!annotations?.length) {
      return [];
    }
    const { viewport } = getEnabledElement(element);
    if (!isStackViewport(viewport)) {
      return [];
    }
    const currentIndex = viewport.getCurrentImageIdIndex();
    return annotations.filter(a => {
      if ((a as { isVisible?: boolean }).isVisible === false) {
        return false;
      }
      const point = (a as { data?: { handles?: { points?: Vec3[] } } })?.data?.handles?.points?.[0];
      if (!point) {
        return false;
      }
      // Always show it (in red) on the OPPOSITE-breast sagittal so the reader sees
      // "not applicable here" instead of nothing.
      if (pointSagittalRelation(viewport as CoreTypes.IViewport, point) === 'mismatch') {
        return true;
      }
      try {
        const closest = getClosestStackImageIndexForPoint(point, viewport);
        return closest != null && closest === currentIndex;
      } catch {
        return false;
      }
    });
  }

  // Grabbing the circle → start dragging it.
  handleSelectedCallback = (evt: { detail: { element: HTMLElement }; preventDefault: () => void }, annotationObj: Record<string, unknown>) => {
    const { element } = evt.detail;
    annotationObj.highlighted = true;
    const enabledElement = getEnabledElement(element);
    const viewportIdsToRender = this._getRenderViewportIds(enabledElement);
    this.editData = { annotation: annotationObj, viewportIdsToRender };
    this._activateModify(element);
    evt.preventDefault();
    triggerAnnotationRenderForViewportIds(viewportIdsToRender);
  };

  toolSelectedCallback = (evt: { detail: { element: HTMLElement }; preventDefault: () => void }, annotationObj: Record<string, unknown>) => {
    // Dragging the body is the same as dragging the (single) handle.
    this.handleSelectedCallback(evt, annotationObj);
  };

  // Near-the-circle hit test (used by the framework to pick the annotation).
  isPointNearTool = (
    element: HTMLElement,
    annotationObj: Record<string, unknown>,
    canvasCoords: [number, number],
    proximity: number
  ): boolean => {
    const { viewport } = getEnabledElement(element);
    const point = (annotationObj as { data: { handles: { points: Vec3[] } } }).data.handles.points[0];
    const canvas = viewport.worldToCanvas(point);
    const prox = Math.max(proximity, (this.configuration as { proximity?: number }).proximity ?? 14);
    return vec2.distance(canvasCoords as vec2, canvas as vec2) < prox;
  };

  getHandleNearImagePoint = (
    element: HTMLElement,
    annotationObj: Record<string, unknown>,
    canvasCoords: [number, number],
    proximity: number
  ) => {
    const { viewport } = getEnabledElement(element);
    const point = (annotationObj as { data: { handles: { points: Vec3[] } } }).data.handles.points[0];
    const canvas = viewport.worldToCanvas(point);
    const prox = Math.max(proximity, (this.configuration as { proximity?: number }).proximity ?? 14);
    return vec2.distance(canvasCoords as vec2, canvas as vec2) < prox ? point : undefined;
  };

  _dragCallback = (evt: { detail: { currentPoints: { world: Vec3 }; element: HTMLElement } }) => {
    this.isDrawing = true;
    const { currentPoints, element } = evt.detail;
    const worldPos = currentPoints.world;
    if (!this.editData) {
      return;
    }
    const { annotation: annotationObj, viewportIdsToRender } = this.editData;
    const data = (annotationObj as { data: { handles: { points: Vec3[] } } }).data;
    data.handles.points[0] = [...worldPos] as Vec3;
    (annotationObj as { invalidated: boolean }).invalidated = true;
    // Re-navigate every OTHER pane in the same Frame of Reference to the slice
    // through the point, so the circle lands on the right anatomy everywhere.
    this._syncOtherViewportsToPoint(element, worldPos);
    triggerAnnotationRenderForViewportIds(viewportIdsToRender);
  };

  _endCallback = (evt: { detail: { element: HTMLElement } }) => {
    const { element } = evt.detail;
    this._deactivateModify(element);
    this.isDrawing = false;
    if (this.editData) {
      triggerAnnotationRenderForViewportIds(this.editData.viewportIdsToRender);
    }
    this.editData = null;
  };

  // Safety: if a drag is cancelled (ESC / interrupted), release the interaction
  // lock so the primary-button Zoom can never get stuck disabled.
  cancel = (element: HTMLElement) => {
    if (this.isDrawing) {
      this.isDrawing = false;
      this._deactivateModify(element);
      const uid = (this.editData?.annotation as { annotationUID?: string })?.annotationUID;
      this.editData = null;
      return uid;
    }
  };

  _activateModify = (element: HTMLElement) => {
    // Tell Cornerstone a tool interaction is in progress so the primary-button
    // ACTIVE tool (Zoom) is skipped for THIS gesture only — otherwise dragging the
    // point would also zoom. `mouseDownActivate` early-returns when this is true.
    // Normal left-click zoom (not on the point) is unaffected: the flag is only set
    // once the circle is actually grabbed, and cleared again on mouse up.
    (csToolsState as { isInteractingWithTool: boolean }).isInteractingWithTool = true;
    element.addEventListener(Events.MOUSE_UP as unknown as string, this._endCallback as EventListener);
    element.addEventListener(Events.MOUSE_DRAG as unknown as string, this._dragCallback as EventListener);
    element.addEventListener(Events.MOUSE_CLICK as unknown as string, this._endCallback as EventListener);
    element.addEventListener(Events.TOUCH_END as unknown as string, this._endCallback as EventListener);
    element.addEventListener(Events.TOUCH_DRAG as unknown as string, this._dragCallback as EventListener);
  };

  _deactivateModify = (element: HTMLElement) => {
    (csToolsState as { isInteractingWithTool: boolean }).isInteractingWithTool = false;
    element.removeEventListener(Events.MOUSE_UP as unknown as string, this._endCallback as EventListener);
    element.removeEventListener(Events.MOUSE_DRAG as unknown as string, this._dragCallback as EventListener);
    element.removeEventListener(Events.MOUSE_CLICK as unknown as string, this._endCallback as EventListener);
    element.removeEventListener(Events.TOUCH_END as unknown as string, this._endCallback as EventListener);
    element.removeEventListener(Events.TOUCH_DRAG as unknown as string, this._dragCallback as EventListener);
  };

  // All viewport ids in this rendering engine that share the source Frame of
  // Reference — the panes the point participates in.
  _getRenderViewportIds = (enabledElement: {
    viewport: { getFrameOfReferenceUID: () => string; getRenderingEngine: () => { getViewports: () => Array<{ id: string; getFrameOfReferenceUID?: () => string }> } };
  }): string[] => {
    const { viewport } = enabledElement;
    const foR = viewport.getFrameOfReferenceUID();
    const engine = viewport.getRenderingEngine();
    if (!engine) {
      return [];
    }
    return engine
      .getViewports()
      .filter(vp => (vp.getFrameOfReferenceUID ? vp.getFrameOfReferenceUID() === foR : true))
      .map(vp => vp.id);
  };

  _syncOtherViewportsToPoint = (element: HTMLElement, worldPos: Vec3) => {
    const { viewport: sourceVp } = getEnabledElement(element);
    syncStackViewportsToWorldPoint(sourceVp as CoreTypes.IViewport, worldPos);
  };

  renderAnnotation = (
    enabledElement: { viewport: CoreTypes.IViewport },
    svgDrawingHelper: unknown
  ): boolean => {
    let renderStatus = false;
    const { viewport } = enabledElement;
    const element = (viewport as unknown as { element: HTMLElement }).element;
    let annotations = getAnnotations(TOOL_NAME, element) as Array<Record<string, unknown>> | undefined;
    if (!annotations?.length) {
      return renderStatus;
    }
    annotations = this.filterInteractableAnnotationsForElement(element, annotations) as Array<Record<string, unknown>>;
    if (!annotations?.length) {
      return renderStatus;
    }

    for (const annotationObj of annotations) {
      const annotationUID = annotationObj.annotationUID as string;
      const data = annotationObj.data as { handles: { points: Vec3[] } };
      const point = data.handles.points[0];
      if (!point) {
        continue;
      }
      // Slice-culling: only render where the point is on/near the current slice.
      if (!isAnnotationVisible(annotationUID)) {
        continue;
      }
      const canvasCoordinates = (viewport as unknown as { worldToCanvas: (p: Vec3) => [number, number] }).worldToCanvas(point);
      const [cx, cy] = canvasCoordinates;
      // Green normally; RED when this is the sagittal view of the OTHER breast (the
      // point can't apply here).
      const reticleColor =
        pointSagittalRelation(viewport, point) === 'mismatch' ? RETICLE_RED : RETICLE_COLOR;
      // Draw the SAME hollow-centre crosshair as the toolbar icon: four inward ticks
      // at N/E/S/W with an empty centre (no ring, no centre dot).
      drawing.drawPath(
        svgDrawingHelper,
        annotationUID,
        'crossRefReticle',
        buildReticleSubArrays(cx, cy) as never,
        { color: reticleColor, lineWidth: RETICLE.lineWidth }
      );
      renderStatus = true;
    }
    return renderStatus;
  };
}

/**
 * Navigate every OTHER stack viewport sharing the source viewport's Frame of
 * Reference to the slice closest to `worldPos`. Shared by the drag handler and the
 * initial placement so the point appears on every pane immediately.
 */
export function syncStackViewportsToWorldPoint(
  sourceViewport: CoreTypes.IViewport,
  worldPos: Vec3
): void {
  const engine = (sourceViewport as unknown as { getRenderingEngine: () => { getViewports: () => CoreTypes.IViewport[] } }).getRenderingEngine();
  if (!engine) {
    return;
  }
  const foR = (sourceViewport as unknown as { getFrameOfReferenceUID: () => string }).getFrameOfReferenceUID();
  const sourceId = (sourceViewport as unknown as { id: string }).id;
  for (const vp of engine.getViewports()) {
    if ((vp as unknown as { id: string }).id === sourceId) {
      continue;
    }
    if (!isStackViewport(vp)) {
      continue; // stack panes only
    }
    if ((vp as unknown as { getFrameOfReferenceUID?: () => string }).getFrameOfReferenceUID?.() !== foR) {
      continue; // must share the (normalized) MR frame of reference
    }
    // Don't jump the OPPOSITE-breast sagittal to the point — it isn't in that breast
    // (it just shows red there). Leave that view where the user left it.
    if (pointSagittalRelation(vp as CoreTypes.IViewport, worldPos) === 'mismatch') {
      continue;
    }
    try {
      const index = getClosestStackImageIndexForPoint(worldPos, vp);
      if (index != null && index !== vp.getCurrentImageIdIndex()) {
        // Mark this as OUR programmatic slice change so the scroll-follow listener
        // ignores the STACK_NEW_IMAGE it will fire (otherwise it would treat the
        // jump as a user scroll and move the point → feedback loop).
        expectedIndex.set((vp as unknown as { id: string }).id, index);
        vp.setImageIdIndex(index);
      }
    } catch {
      /* non-fatal: never break a drag/placement over one pane */
    }
  }
}

// -------------------------------------------------------------------------
// Scroll-follow: scrolling a pane carries the point to the new slice (sticky,
// crosshairs-like) and repositions it in the other planes — instead of hiding it.
// -------------------------------------------------------------------------

// index we last set programmatically per viewport → lets the scroll listener tell
// a user scroll (react) from our own sync jump (ignore).
const expectedIndex = new Map<string, number>();
// element → attached STACK_NEW_IMAGE listener (so we can detach cleanly).
const scrollHandlers = new Map<HTMLElement, EventListener>();

const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const normalize = (v: Vec3): Vec3 => {
  const len = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / len, v[1] / len, v[2] / len];
};

// Move `point` perpendicular onto the plane of `imageId` (keeps its in-plane
// position, updates the through-plane component to the new slice). Returns null if
// the plane metadata is missing, or the same point when already on the slice.
function projectPointOntoSlice(imageId: string, point: Vec3): Vec3 | null {
  const plane = metaData.get('imagePlaneModule', imageId) as
    | { imagePositionPatient?: number[]; rowCosines?: number[]; columnCosines?: number[] }
    | undefined;
  const ipp = plane?.imagePositionPatient;
  const row = plane?.rowCosines;
  const col = plane?.columnCosines;
  if (!ipp || !row || !col || ipp.length < 3 || row.length < 3 || col.length < 3) {
    return null;
  }
  const n = normalize(cross(row as Vec3, col as Vec3));
  const d = n[0] * (ipp[0] - point[0]) + n[1] * (ipp[1] - point[1]) + n[2] * (ipp[2] - point[2]);
  if (Math.abs(d) < 1e-3) {
    return point; // already on this slice
  }
  return [point[0] + d * n[0], point[1] + d * n[1], point[2] + d * n[2]];
}

function onViewportScrolled(evt: Event): void {
  const detail = (evt as CustomEvent).detail as { viewportId?: string; imageId?: string; imageIdIndex?: number };
  const { viewportId, imageId, imageIdIndex } = detail || {};
  if (!viewportId || !imageId) {
    return;
  }
  // Our own sync jump — ignore exactly once.
  if (expectedIndex.get(viewportId) === imageIdIndex) {
    expectedIndex.delete(viewportId);
    return;
  }
  const enabled = getEnabledElementByViewportId(viewportId);
  const viewport = enabled?.viewport as CoreTypes.IViewport | undefined;
  if (!viewport || !isStackViewport(viewport)) {
    return;
  }
  const element = (viewport as unknown as { element: HTMLElement }).element;
  const annotations = (getAnnotations(TOOL_NAME, element) as Array<{ data: { handles: { points: Vec3[] } }; invalidated: boolean }>) || [];
  if (!annotations.length) {
    return;
  }
  const annotationObj = annotations[0];
  const point = annotationObj.data.handles.points[0];
  // Scrolling the OPPOSITE-breast sagittal must NOT drag the point into that breast —
  // it isn't applicable there. Leave the point where it is (it stays red on this view).
  if (pointSagittalRelation(viewport, point) === 'mismatch') {
    return;
  }
  // Use the event's imageId (viewport.currentImageIdIndex is not updated until AFTER
  // this event), so we project onto the slice the user just scrolled TO.
  const newPoint = projectPointOntoSlice(imageId, point);
  if (!newPoint || newPoint === point) {
    return;
  }
  annotationObj.data.handles.points[0] = newPoint;
  annotationObj.invalidated = true;
  // Reposition the point in the other planes (orthogonal scroll usually only slides
  // the dot within them; an oblique scroll may also nudge their slice).
  syncStackViewportsToWorldPoint(viewport, newPoint);
  const foR = (viewport as unknown as { getFrameOfReferenceUID: () => string }).getFrameOfReferenceUID();
  const engine = (viewport as unknown as { getRenderingEngine: () => { getViewports: () => Array<{ id: string; getFrameOfReferenceUID?: () => string }> } }).getRenderingEngine();
  const renderIds = engine
    ? engine.getViewports().filter(vp => (vp.getFrameOfReferenceUID ? vp.getFrameOfReferenceUID() === foR : true)).map(vp => vp.id)
    : [viewportId];
  triggerAnnotationRenderForViewportIds(renderIds);
}

/** Attach the scroll-follow listener to the given viewport elements (idempotent). */
export function attachCrossReferenceScrollFollow(elements: Array<HTMLElement | undefined | null>): void {
  for (const el of elements) {
    if (!el || scrollHandlers.has(el)) {
      continue;
    }
    el.addEventListener(CoreEnums.Events.STACK_NEW_IMAGE as unknown as string, onViewportScrolled);
    scrollHandlers.set(el, onViewportScrolled);
  }
}

/** Detach every scroll-follow listener. */
export function detachCrossReferenceScrollFollow(): void {
  for (const [el, handler] of scrollHandlers) {
    el.removeEventListener(CoreEnums.Events.STACK_NEW_IMAGE as unknown as string, handler);
  }
  scrollHandlers.clear();
  expectedIndex.clear();
}

/**
 * Build (or move) the single Cross Reference Point at the centre of the given
 * viewport. Removes any existing point first so there is never more than one.
 * Returns the created annotation UID (or null).
 */
export function placeCrossReferencePoint(viewport: CoreTypes.IStackViewport | CoreTypes.IViewport): string | null {
  try {
    const element = (viewport as unknown as { element: HTMLElement }).element;
    if (!element) {
      return null;
    }
    clearCrossReferencePoints(element);

    const canvas = element.getBoundingClientRect();
    const centerCanvas: [number, number] = [canvas.width / 2, canvas.height / 2];
    const worldCenter = (viewport as unknown as { canvasToWorld: (p: [number, number]) => Vec3 }).canvasToWorld(centerCanvas);
    const camera = (viewport as unknown as { getCamera: () => { viewPlaneNormal?: Vec3; viewUp?: Vec3 } }).getCamera();
    const FrameOfReferenceUID = (viewport as unknown as { getFrameOfReferenceUID: () => string }).getFrameOfReferenceUID();
    const referencedImageId = (viewport as unknown as { getCurrentImageId?: () => string }).getCurrentImageId?.();

    const annotationObj = {
      annotationUID: csCoreUtilities.uuidv4(),
      highlighted: false,
      invalidated: true,
      isLocked: false,
      isVisible: true,
      metadata: {
        toolName: TOOL_NAME,
        viewPlaneNormal: camera?.viewPlaneNormal,
        viewUp: camera?.viewUp,
        FrameOfReferenceUID,
        referencedImageId,
      },
      data: {
        handles: { points: [[...worldCenter]] },
      },
    };
    addAnnotation(annotationObj as never, element);
    // Bring every other pane to the slice through the point so the circle shows up
    // everywhere right away (not only in the pane it was placed in).
    syncStackViewportsToWorldPoint(viewport as CoreTypes.IViewport, [...worldCenter] as Vec3);
    return annotationObj.annotationUID;
  } catch {
    return null;
  }
}

/** Remove every Cross Reference Point (there is only ever one). */
export function clearCrossReferencePoints(element?: HTMLElement): void {
  try {
    const annotations = (getAnnotations(TOOL_NAME, element as HTMLElement) as Array<{ annotationUID: string }>) || [];
    annotations.forEach(a => removeAnnotation(a.annotationUID));
  } catch {
    /* ignore */
  }
}

export default CrossReferencePointTool;
export { CrossReferencePointTool };
