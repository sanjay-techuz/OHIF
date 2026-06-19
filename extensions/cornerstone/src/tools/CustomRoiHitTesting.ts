import {
  CircleROITool,
  EllipticalROITool,
  RectangleROITool,
  drawing,
  annotation as annotationApi,
} from '@cornerstonejs/tools';
import { getEnabledElement } from '@cornerstonejs/core';

// UX: cornerstone3D's stock ROI tools have no explicit "move" affordance —
// moving an annotation requires clicking exactly on the border. The body of
// the shape counts as empty space so users CAN draw nested annotations, but
// there's no obvious way to grab an existing one.
//
// These subclasses add a small visible "move handle" at the geometric center
// of each ROI. The handle is:
//   - ONLY drawn for annotations in the current viewport (uses the same
//     `filterInteractableAnnotationsForElement` filter the parent uses).
//   - ONLY visible when the cursor is hovering anywhere inside the annotation
//     (tracked via overridden `mouseMoveCallback` → custom `_customHovered` flag).
//   - Rendered as a transparent-fill ring in the annotation's color.
//
// `isPointNearTool` is widened to ONLY match the move-handle hit zone, so a
// click inside the body falls through to new-annotation creation (nested
// annotations work). Border-resize handles (perimeter point for CircleROI, 4
// corners for Rectangle/Ellipse) are untouched.
//
// Each subclass keeps the parent's `static toolName` so saved measurements
// keep working.

const { getAnnotations } = annotationApi.state;
const { drawCircle } = drawing as any;

type Point2 = [number, number];

// Visible radius of the move handle (canvas pixels). Hit-zone is a bit larger
// so it's easy to grab without pixel-perfect aim.
const MOVE_HANDLE_VISIBLE_RADIUS = 6;
const MOVE_HANDLE_HIT_RADIUS = 10;

// CircleROI border-resize affordance: cursor within this many pixels of the
// circle's border (inside OR outside) routes the click to the perimeter handle
// so drag resizes the circle (and the stock cornerstone green handle becomes
// visible at `points[1]`).
const CIRCLE_BORDER_PROXIMITY = 10;

type ShapeKind = 'circle' | 'rectangle' | 'ellipse';

interface ShapeMetrics {
  center: Point2;
  // Per-kind geometry used for both center lookup AND inside-shape hover.
  containsPoint: (p: Point2) => boolean;
  // CircleROI only: distance from canvas point to the border circle (signed
  // would be useful but unsigned suffices — proximity check is the same for
  // inside and outside).
  distanceToBorder?: (p: Point2) => number;
}

function getShapeMetrics(
  element: HTMLDivElement,
  annotation: any,
  kind: ShapeKind
): ShapeMetrics | null {
  try {
    const enabledElement = getEnabledElement(element);
    if (!enabledElement) {
      return null;
    }
    const { viewport } = enabledElement;
    const points = annotation?.data?.handles?.points;
    if (!points) {
      return null;
    }

    if (kind === 'circle') {
      if (points.length < 2) {
        return null;
      }
      const center = viewport.worldToCanvas(points[0]) as Point2;
      const perimeter = viewport.worldToCanvas(points[1]) as Point2;
      const radius = Math.hypot(
        perimeter[0] - center[0],
        perimeter[1] - center[1]
      );
      return {
        center,
        containsPoint: (p: Point2) => {
          const dx = p[0] - center[0];
          const dy = p[1] - center[1];
          return dx * dx + dy * dy <= radius * radius;
        },
        distanceToBorder: (p: Point2) => {
          const dx = p[0] - center[0];
          const dy = p[1] - center[1];
          return Math.abs(Math.hypot(dx, dy) - radius);
        },
      };
    }

    if (kind === 'rectangle') {
      if (points.length < 4) {
        return null;
      }
      const a = viewport.worldToCanvas(points[0]) as Point2;
      const b = viewport.worldToCanvas(points[3]) as Point2;
      const minX = Math.min(a[0], b[0]);
      const maxX = Math.max(a[0], b[0]);
      const minY = Math.min(a[1], b[1]);
      const maxY = Math.max(a[1], b[1]);
      return {
        center: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2],
        containsPoint: (p: Point2) =>
          p[0] >= minX && p[0] <= maxX && p[1] >= minY && p[1] <= maxY,
      };
    }

    // ellipse: points are [bottom, top, left, right] on the canvas.
    if (points.length < 4) {
      return null;
    }
    const [bottom, top, left, right] = points.map((pt: number[]) =>
      viewport.worldToCanvas(pt)
    ) as Point2[];
    const w = Math.hypot(left[0] - right[0], left[1] - right[1]);
    const h = Math.hypot(top[0] - bottom[0], top[1] - bottom[1]);
    const center: Point2 = [(left[0] + right[0]) / 2, (top[1] + bottom[1]) / 2];
    const xRadius = w / 2;
    const yRadius = h / 2;
    return {
      center,
      containsPoint: (p: Point2) => {
        if (xRadius <= 0 || yRadius <= 0) {
          return false;
        }
        const nx = (p[0] - center[0]) / xRadius;
        const ny = (p[1] - center[1]) / yRadius;
        return nx * nx + ny * ny <= 1;
      },
    };
  } catch {
    return null;
  }
}

function pointInMoveHandle(canvasCoords: Point2, center: Point2): boolean {
  const dx = canvasCoords[0] - center[0];
  const dy = canvasCoords[1] - center[1];
  return dx * dx + dy * dy <= MOVE_HANDLE_HIT_RADIUS * MOVE_HANDLE_HIT_RADIUS;
}

function getAnnotationColor(annotation: any): string {
  return (
    annotation?.data?.handles?.activeColor ||
    annotation?.data?.color ||
    annotation?.metadata?.color ||
    'rgb(255,255,255)'
  );
}

function decorateRender(
  tool: any,
  enabledElement: any,
  svgDrawingHelper: any,
  kind: ShapeKind
) {
  try {
    const { viewport } = enabledElement;
    const { element } = viewport;
    const raw = getAnnotations(tool.getToolName(), element) || [];
    // Same per-viewport scoping the parent's renderAnnotation uses — otherwise
    // we'd draw the move handle on viewports where the annotation isn't even
    // visible (e.g. side-by-side MG layouts).
    const annotations: any[] =
      tool.filterInteractableAnnotationsForElement?.(element, raw) || raw;

    for (const ann of annotations) {
      if (!ann || ann.isVisible === false) {
        continue;
      }
      // Only show the handle when the cursor is hovering this specific
      // annotation. Skip while the annotation is being actively edited
      // (the parent already hides the element cursor during edit).
      if (!ann._customHovered) {
        continue;
      }
      const metrics = getShapeMetrics(element, ann, kind);
      if (!metrics) {
        continue;
      }
      const color = getAnnotationColor(ann);
      // Distinct UID suffix so cornerstone tracks/removes our SVG node
      // correctly and doesn't collide with the parent tool's own SVG nodes.
      // No `fill` → SVG default 'transparent' → outline-only ring in the
      // annotation's color.
      drawCircle(
        svgDrawingHelper,
        ann.annotationUID,
        'custom-move-handle',
        metrics.center,
        MOVE_HANDLE_VISIBLE_RADIUS,
        {
          color,
          lineWidth: 2,
        }
      );
    }
  } catch {
    /* never let the move-handle decoration break annotation rendering */
  }
}

function installHoverTracking(tool: any, kind: ShapeKind) {
  const parentMouseMoveCallback = tool.mouseMoveCallback;
  tool.mouseMoveCallback = (evt: any, filteredAnnotations: any[]) => {
    const parentNeedsRedraw =
      parentMouseMoveCallback?.call(tool, evt, filteredAnnotations) ?? false;
    let needsRedraw = parentNeedsRedraw;
    try {
      const { element, currentPoints } = evt.detail || {};
      const canvasCoords = currentPoints?.canvas as Point2 | undefined;
      if (!element || !canvasCoords || !filteredAnnotations) {
        return needsRedraw;
      }
      for (const ann of filteredAnnotations) {
        if (!ann) {
          continue;
        }
        const metrics = getShapeMetrics(element, ann, kind);
        const inside = metrics ? metrics.containsPoint(canvasCoords) : false;
        if (ann._customHovered !== inside) {
          ann._customHovered = inside;
          needsRedraw = true;
        }
      }
    } catch {
      /* ignore — cornerstone will redraw next move event */
    }
    return needsRedraw;
  };
}

// ---------------------------------------------------------------------------

class CustomCircleROITool extends CircleROITool {
  static toolName = 'CircleROI';

  _csParentRenderAnnotation = this.renderAnnotation;
  _csParentGetHandleNearImagePoint = this.getHandleNearImagePoint;

  constructor(toolProps = {}, defaultToolProps = undefined) {
    super(toolProps, defaultToolProps);
    this.isPointNearTool = (
      element: HTMLDivElement,
      annotation: any,
      canvasCoords: Point2
    ) => {
      const metrics = getShapeMetrics(element, annotation, 'circle');
      return !!metrics && pointInMoveHandle(canvasCoords, metrics.center);
    };
    installHoverTracking(this, 'circle');
  }

  // CircleROI border-resize affordance: widen `getHandleNearImagePoint` so the
  // perimeter handle (`points[1]`) is reported when the cursor is anywhere
  // within CIRCLE_BORDER_PROXIMITY of the border, not just at the stock fixed
  // perimeter point. Setting `activeHandleIndex = 1` makes cornerstone draw
  // its stock green handle at `points[1]` (so the user sees a clear resize
  // affordance), and cornerstone's existing `_dragHandle` for handleIndex=1
  // does `points[1] = canvasToWorld(currentCanvasPoints)` on drag — i.e. the
  // perimeter snaps to the cursor and resizing works from anywhere on the
  // border. No custom render needed — the stock cornerstone handle is enough.
  getHandleNearImagePoint = (
    element: HTMLDivElement,
    annotation: any,
    canvasCoords: Point2,
    proximity: number
  ) => {
    const parentHit = this._csParentGetHandleNearImagePoint?.call(
      this,
      element,
      annotation,
      canvasCoords,
      proximity
    );
    if (parentHit) {
      return parentHit;
    }
    try {
      const metrics = getShapeMetrics(element, annotation, 'circle');
      const dist = metrics?.distanceToBorder?.(canvasCoords);
      if (dist !== undefined && dist <= CIRCLE_BORDER_PROXIMITY) {
        const points = annotation?.data?.handles?.points;
        if (points && points.length >= 2) {
          annotation.data.handles.activeHandleIndex = 1;
          return points[1];
        }
      }
    } catch {
      /* fall through */
    }
    return undefined;
  };

  renderAnnotation = (enabledElement: any, svgDrawingHelper: any) => {
    const ret = this._csParentRenderAnnotation(enabledElement, svgDrawingHelper);
    decorateRender(this, enabledElement, svgDrawingHelper, 'circle');
    return ret;
  };
}

class CustomRectangleROITool extends RectangleROITool {
  static toolName = 'RectangleROI';

  _csParentRenderAnnotation = this.renderAnnotation;

  constructor(toolProps = {}, defaultToolProps = undefined) {
    super(toolProps, defaultToolProps);
    this.isPointNearTool = (
      element: HTMLDivElement,
      annotation: any,
      canvasCoords: Point2
    ) => {
      const metrics = getShapeMetrics(element, annotation, 'rectangle');
      return !!metrics && pointInMoveHandle(canvasCoords, metrics.center);
    };
    installHoverTracking(this, 'rectangle');
  }

  renderAnnotation = (enabledElement: any, svgDrawingHelper: any) => {
    const ret = this._csParentRenderAnnotation(enabledElement, svgDrawingHelper);
    decorateRender(this, enabledElement, svgDrawingHelper, 'rectangle');
    return ret;
  };
}

class CustomEllipticalROITool extends EllipticalROITool {
  static toolName = 'EllipticalROI';

  _csParentRenderAnnotation = this.renderAnnotation;

  constructor(toolProps = {}, defaultToolProps = undefined) {
    super(toolProps, defaultToolProps);
    this.isPointNearTool = (
      element: HTMLDivElement,
      annotation: any,
      canvasCoords: Point2
    ) => {
      const metrics = getShapeMetrics(element, annotation, 'ellipse');
      return !!metrics && pointInMoveHandle(canvasCoords, metrics.center);
    };
    installHoverTracking(this, 'ellipse');
  }

  renderAnnotation = (enabledElement: any, svgDrawingHelper: any) => {
    const ret = this._csParentRenderAnnotation(enabledElement, svgDrawingHelper);
    decorateRender(this, enabledElement, svgDrawingHelper, 'ellipse');
    return ret;
  };
}

export { CustomCircleROITool, CustomRectangleROITool, CustomEllipticalROITool };
