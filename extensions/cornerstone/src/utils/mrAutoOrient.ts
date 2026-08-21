/**
 * @author Sanjay Balai
 *
 * [MR-AUTO-ORIENT] Auto-orient MR stack viewports to the STANDARD RADIOLOGICAL
 * display convention for their acquisition plane, derived from
 * ImageOrientationPatient (0020,0037). Display-only (camera rotation/flip) — it
 * does NOT touch pixels or annotations, and is consistent for faculty & student
 * because it is driven purely by the image metadata.
 *
 * Convention (radiological — patient-right on the viewer's left):
 *   AXIAL     → Anterior top,  Right left
 *   CORONAL   → Superior top,  Right left
 *   SAGITTAL  → Superior top,  Anterior left
 *
 * It only corrects orientation with a horizontal and/or vertical flip — the
 * direction-UNAMBIGUOUS case that covers breast MR (where the on-screen axes
 * already match the plane, just mirrored/upside-down; an axial 180° = flipH +
 * flipV). If the screen axes are 90°-swapped, or the plane is OBLIQUE, the
 * viewport is left untouched.
 *
 * REVERT: delete this file and its single call site tagged [MR-AUTO-ORIENT] in
 * services/ViewportService/CornerstoneViewportService.ts.
 */
import { Enums, metaData, Types } from '@cornerstonejs/core';

type Vec3 = [number, number, number];

// LPS dominant axis: 0 = X (R↔L), 1 = Y (A↔P), 2 = Z (S↔I).
const dominantAxis = (v: Vec3): number => {
  const a = [Math.abs(v[0]), Math.abs(v[1]), Math.abs(v[2])];
  return a[0] >= a[1] && a[0] >= a[2] ? 0 : a[1] >= a[2] ? 1 : 2;
};

const planeOf = (row: Vec3, col: Vec3): 'AXIAL' | 'SAGITTAL' | 'CORONAL' | 'OBLIQUE' => {
  // Slice normal = row × col; classify by the axis it is closest to.
  const n: Vec3 = [
    row[1] * col[2] - row[2] * col[1],
    row[2] * col[0] - row[0] * col[2],
    row[0] * col[1] - row[1] * col[0],
  ];
  const a = [Math.abs(n[0]), Math.abs(n[1]), Math.abs(n[2])];
  const max = Math.max(a[0], a[1], a[2]);
  if (max < 0.75) {
    return 'OBLIQUE';
  }
  if (max === a[2]) {
    return 'AXIAL';
  }
  if (max === a[0]) {
    return 'SAGITTAL';
  }
  return 'CORONAL';
};

// LPS: +X = Left, +Y = Posterior, +Z = Superior. Target screen-UP + screen-RIGHT.
const TARGET: Record<string, { up: Vec3; right: Vec3 }> = {
  AXIAL: { up: [0, -1, 0], right: [1, 0, 0] }, // up = Anterior, right = Left
  CORONAL: { up: [0, 0, 1], right: [1, 0, 0] }, // up = Superior, right = Left
  SAGITTAL: { up: [0, 0, 1], right: [0, 1, 0] }, // up = Superior, right = Posterior
};

const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

export function applyRadiologicalOrientationMR(viewport: Types.IStackViewport): void {
  try {
    const imageId = viewport?.getCurrentImageId?.();
    if (!imageId) {
      return;
    }
    // MR only.
    if (metaData.get('generalSeriesModule', imageId)?.modality !== 'MR') {
      return;
    }

    const plane = metaData.get('imagePlaneModule', imageId);
    const row = plane?.rowCosines as Vec3 | undefined;
    const col = plane?.columnCosines as Vec3 | undefined;
    if (!row || !col || row.length < 3 || col.length < 3) {
      return;
    }

    const target = TARGET[planeOf(row, col)];
    if (!target) {
      return; // OBLIQUE / unknown — leave as-is
    }

    // Current screen-UP = -columnCosines, screen-RIGHT = rowCosines.
    const U: Vec3 = [-col[0], -col[1], -col[2]];
    const R: Vec3 = [row[0], row[1], row[2]];

    // Only handle the case where the on-screen axis PAIR already matches the
    // target (no 90° rotation needed). Otherwise leave the viewport untouched.
    if (
      dominantAxis(U) !== dominantAxis(target.up) ||
      dominantAxis(R) !== dominantAxis(target.right)
    ) {
      return;
    }

    const flipV = dot(U, target.up) < 0; // up points opposite target → flip vertical
    const flipH = dot(R, target.right) < 0; // right points opposite target → flip horizontal

    // AUTHORITATIVE, ABSOLUTE flip — always drive the camera to EXACTLY the
    // IOP-derived flip, even when both are false, so a stale flip restored from a
    // stored camera presentation (setPresentations on every (re)load / HP swap) is
    // CLEARED. We only skip when the camera is ALREADY exactly right, to avoid a
    // redundant setCamera/render.
    const cam = viewport.getCamera?.();
    if (cam && !!cam.flipHorizontal === flipH && !!cam.flipVertical === flipV) {
      return;
    }
    // setCamera({ flipHorizontal / flipVertical }) is the exact API the Flip-H /
    // Flip-V toolbar buttons use (setProperties({ rotation }) is a no-op on a stack
    // viewport in this build). Values are absolute; an axial 180° = both flips.
    viewport.setCamera({ flipHorizontal: flipH, flipVertical: flipV });
    viewport.render?.();
  } catch (e) {
    // Non-fatal — never break a viewport load over auto-orient.
    // eslint-disable-next-line no-console
    console.warn('[MR-AUTO-ORIENT] skipped:', e);
  }
}

/**
 * LOAD-path scheduler. Fixed timed re-applies alone were unreliable because OHIF
 * re-touches the camera at UNPREDICTABLE times after setStack resolves — a late
 * setPresentations / setDisplayArea / resetCamera during concurrent pane loads or
 * a hanging-protocol settle can clobber the flip AFTER the last timed shot, which
 * is exactly the "random across hanging protocols" failure.
 *
 * So instead of only guessing times, we ALSO listen for the camera actually
 * changing (CAMERA_MODIFIED) and re-assert the standard orientation each time, for
 * a short window after load. applyRadiologicalOrientationMR is idempotent (no-ops
 * when already correct), so this converges and can't loop; after the window we
 * detach so a deliberate manual flip is respected. A few timed shots remain as a
 * fallback in case a change lands without firing the event.
 */
export function scheduleRadiologicalOrientationMR(viewport: Types.IStackViewport): void {
  const run = () => applyRadiologicalOrientationMR(viewport);
  run();
  // Fallback timed shots (in case some override doesn't fire CAMERA_MODIFIED).
  [150, 400, 800, 1300, 2000].forEach(ms => setTimeout(run, ms));

  // Primary mechanism: correct the orientation whenever the camera changes, for a
  // ~2.5s settle window. Coalesced to the next tick so we never re-enter setCamera
  // synchronously from within a CAMERA_MODIFIED dispatch.
  const el = (viewport as unknown as { element?: HTMLElement })?.element;
  if (!el) {
    return;
  }
  let pending = false;
  const onCameraModified = () => {
    if (pending) {
      return;
    }
    pending = true;
    setTimeout(() => {
      pending = false;
      applyRadiologicalOrientationMR(viewport);
    }, 0);
  };
  el.addEventListener(Enums.Events.CAMERA_MODIFIED, onCameraModified);
  setTimeout(() => {
    try {
      el.removeEventListener(Enums.Events.CAMERA_MODIFIED, onCameraModified);
    } catch {
      /* noop */
    }
  }, 2500);
}
