/**
 * @author Sanjay Balai
 *
 * [MAMMO-AUTO-ORIENT] Auto-orient Secondary-Capture-wrapped tomosynthesis (DBT)
 * stack viewports to the STANDARD RADIOLOGICAL mammography display convention,
 * derived from PatientOrientation (0020,0020). Display-only (camera flip) — it
 * does NOT touch pixels or annotations, and is identical for faculty & student
 * because it is driven purely by image metadata.
 *
 * WHY only SC-wrapped tomo: some vendors (e.g. LifeTrack teaching exports) ship
 * the DBT reconstruction as Secondary-Capture slices whose pixels are stored in
 * the RIGHT-breast orientation for BOTH sides — so the LEFT views open unmirrored
 * (nipple pointing the wrong way). The proper 2D FFDM views in the same study are
 * already stored correctly (verified: R-CC 2D `P\L`, L-CC 2D `A\R`), so this rule
 * is a NO-OP for them and is deliberately gated to the SC-tomo slices only, to be
 * certain it can never disturb any correctly-authored series (2D FFDM, CEM, real
 * 13.1.3 DBT, MR, US).
 *
 * PatientOrientation is two values: value 1 = the anatomical direction toward the
 * image's RIGHT edge (increasing column), value 2 = toward the BOTTOM edge
 * (increasing row). The standard display target per view (taken from the same
 * studies' correctly-displaying 2D views) is:
 *   R CC  → P \ L      L CC  → A \ R
 *   R MLO → P \ F(L)   L MLO → A \ F(R)
 * i.e. chest wall (Posterior) toward the right edge for a RIGHT breast, toward the
 * left edge for a LEFT breast (nipple/Anterior the reverse) — the "back-to-back"
 * mirror. A horizontal flip corrects value 1 (right edge); a vertical flip
 * corrects value 2 (bottom edge).
 *
 * REVERT: delete this file and its single call site tagged [MAMMO-AUTO-ORIENT] in
 * services/ViewportService/CornerstoneViewportService.ts.
 */
import { Enums, metaData, Types } from '@cornerstonejs/core';

const SECONDARY_CAPTURE_SOP_CLASS = '1.2.840.10008.5.1.4.1.1.7';
const BREAST_TOMO_SOP_CLASS = '1.2.840.10008.5.1.4.1.1.13.1.3'; // Breast Tomosynthesis Image Storage

// At most ONE active settle-window per viewport element. Repeated schedule calls (fast
// sidebar toggles, HP changes) MUST reuse the open window and only push its expiry out —
// never stack another CAMERA_MODIFIED listener or another batch of timers. Stacking N
// listeners turns a single camera change into an N-deep synchronous re-apply cascade that
// freezes the browser tab; capping at one listener per element keeps every correction
// cheap and bounded.
const SETTLE_MS = 2500;
const mammoOrientWindows = new WeakMap<HTMLElement, { expiry: number }>();

// A DBT tomosynthesis slice — either the proper Breast-Tomosynthesis SOP class, OR the
// Secondary-Capture-wrapped tomo some vendors (e.g. LifeTrack teaching exports) ship instead. Both can
// store the LEFT views in the right-breast orientation; the flip below only acts when PatientOrientation
// actually disagrees with the standard target, so a correctly-authored DBT stack stays untouched.
// Narrowed to tomo so it can never disturb 2D FFDM, CEM, MR or US.
const isTomoSlice = (instance: any): boolean => {
  if (!instance) {
    return false;
  }
  if (instance.SOPClassUID === BREAST_TOMO_SOP_CLASS) {
    return true;
  }
  if (instance.SOPClassUID === SECONDARY_CAPTURE_SOP_CLASS) {
    const raw = instance.ImageType;
    const imageType = (Array.isArray(raw) ? raw.join('\\') : String(raw || '')).toUpperCase();
    return /\bVOLUME\b/.test(imageType) || imageType.includes('TOMOSYNTHESIS');
  }
  return false;
};

// Anatomical axis of a PatientOrientation letter, and its opposite direction.
const AXIS: Record<string, string> = { A: 'AP', P: 'AP', R: 'RL', L: 'RL', H: 'HF', F: 'HF' };
const OPPOSITE: Record<string, string> = { A: 'P', P: 'A', R: 'L', L: 'R', H: 'F', F: 'H' };

const primaryLetter = (v: string): string => String(v || '').trim().charAt(0).toUpperCase();

/** Laterality ('R'|'L') and view ('CC'|'MLO') from tags, tolerant of missing ones. */
const lateralityAndView = (instance: any): { lat: 'R' | 'L' | null; view: 'CC' | 'MLO' | null } => {
  const desc = String(instance?.SeriesDescription || '').toUpperCase();
  let lat: 'R' | 'L' | null = null;
  const il = String(instance?.ImageLaterality || '').toUpperCase();
  if (il === 'R' || il === 'L') {
    lat = il;
  } else if (/\bL(?:EFT)?\b/.test(desc) || /^L[\s_-]/.test(desc)) {
    lat = 'L';
  } else if (/\bR(?:IGHT)?\b/.test(desc) || /^R[\s_-]/.test(desc)) {
    lat = 'R';
  }
  const view: 'CC' | 'MLO' | null = /\bMLO\b/.test(desc) ? 'MLO' : /\bCC\b/.test(desc) ? 'CC' : null;
  return { lat, view };
};

/**
 * Target [rightEdge, bottomEdge] anatomical directions for the standard display of
 * a mammography view, matching the correctly-authored 2D FFDM of the same source.
 */
const targetOrientation = (lat: 'R' | 'L', view: 'CC' | 'MLO'): [string, string] => {
  if (view === 'CC') {
    return lat === 'R' ? ['P', 'L'] : ['A', 'R'];
  }
  // MLO — bottom edge is inferior (Foot) for both sides; right edge is the A/P mirror.
  return lat === 'R' ? ['P', 'F'] : ['A', 'F'];
};

export function applyRadiologicalOrientationMammo(viewport: Types.IStackViewport): void {
  try {
    const imageId = viewport?.getCurrentImageId?.();
    if (!imageId) {
      return;
    }
    // Mammography only.
    if (metaData.get('generalSeriesModule', imageId)?.modality !== 'MG') {
      return;
    }
    const instance: any = metaData.get('instance', imageId);
    // Gate to DBT tomo slices (proper 13.1.3 OR SC-wrapped). The flip only fires when
    // PatientOrientation disagrees with the target, so correctly-stored tomo is a no-op and
    // 2D FFDM / CEM / MR / US are never touched.
    if (!isTomoSlice(instance)) {
      return;
    }

    const rawPO = instance.PatientOrientation;
    const po: string[] = Array.isArray(rawPO)
      ? rawPO.map(String)
      : String(rawPO || '').split('\\');
    if (po.length < 2) {
      return; // no orientation info — cannot decide, leave untouched
    }
    const v1 = primaryLetter(po[0]); // toward right edge
    const v2 = primaryLetter(po[1]); // toward bottom edge

    const { lat, view } = lateralityAndView(instance);
    if (!lat || !view) {
      return; // can't classify → don't guess
    }
    const [t1, t2] = targetOrientation(lat, view);

    // Only decide a flip when the stored axis matches the target axis (never a 90°
    // case). If the axes disagree, leave the viewport untouched.
    let flipH = false;
    let flipV = false;
    if (AXIS[v1] && AXIS[v1] === AXIS[t1]) {
      flipH = v1 === OPPOSITE[t1];
    } else if (AXIS[v1] !== AXIS[t1]) {
      return;
    }
    if (AXIS[v2] && AXIS[v2] === AXIS[t2]) {
      flipV = v2 === OPPOSITE[t2];
    } else if (AXIS[v2] !== AXIS[t2]) {
      return;
    }

    // AUTHORITATIVE, ABSOLUTE flip — always drive the camera to EXACTLY the derived
    // flip so a stale flip restored from a stored camera presentation is cleared.
    // Skip only when the camera is already exactly right (avoid a redundant render).
    const cam = viewport.getCamera?.();
    if (cam && !!cam.flipHorizontal === flipH && !!cam.flipVertical === flipV) {
      return;
    }
    viewport.setCamera({ flipHorizontal: flipH, flipVertical: flipV });
    viewport.render?.();
  } catch (e) {
    // Non-fatal — never break a viewport load over auto-orient.
    // eslint-disable-next-line no-console
    console.warn('[MAMMO-AUTO-ORIENT] skipped:', e);
  }
}

/**
 * LOAD-path scheduler — same design as the MR variant: apply now, a few timed
 * re-applies, plus a short CAMERA_MODIFIED settle window (OHIF re-touches the
 * camera at unpredictable times after setStack). applyRadiologicalOrientationMammo
 * is idempotent, so this converges and can't loop; after the window we detach so a
 * deliberate manual flip is respected.
 */
export function scheduleRadiologicalOrientationMammo(viewport: Types.IStackViewport): void {
  // Cheap gate: only mammography viewports schedule the settle window. Non-MG loads
  // (MR/US/…) return immediately without attaching timers or a camera listener.
  try {
    const imageId = viewport?.getCurrentImageId?.();
    if (!imageId || metaData.get('generalSeriesModule', imageId)?.modality !== 'MG') {
      return;
    }
  } catch {
    return;
  }

  // Always re-assert orientation immediately — idempotent and cheap.
  applyRadiologicalOrientationMammo(viewport);

  const el = (viewport as unknown as { element?: HTMLElement })?.element;
  if (!el) {
    return;
  }

  // If a settle-window is already open for THIS element, just extend it and keep the
  // single listener/timers in place. This is what prevents the freeze on fast toggling —
  // no second listener is ever attached to the same element.
  const existing = mammoOrientWindows.get(el);
  if (existing) {
    existing.expiry = Date.now() + SETTLE_MS;
    return;
  }

  const state = { expiry: Date.now() + SETTLE_MS };
  mammoOrientWindows.set(el, state);

  const run = () => applyRadiologicalOrientationMammo(viewport);
  const timers = [150, 400, 800, 1300, 2000].map(ms => setTimeout(run, ms));

  let pending = false;
  const onCameraModified = () => {
    if (pending) {
      return;
    }
    // Correct the flip SYNCHRONOUSLY — in the SAME task as the camera change that fired
    // this event (e.g. a resize or HP re-stack that restored flipHorizontal but dropped
    // flipVertical, leaving a half-flipped camera). An async setTimeout would let that
    // half-flipped frame paint first — the visible flicker. This is safe ONLY because the
    // window guard above guarantees a single listener per element: the `pending` guard
    // blocks re-entry and the skip-if-correct apply is a no-op once the camera is right,
    // so it converges in one pass instead of cascading across stacked listeners.
    pending = true;
    try {
      applyRadiologicalOrientationMammo(viewport);
    } finally {
      pending = false;
    }
  };
  el.addEventListener(Enums.Events.CAMERA_MODIFIED, onCameraModified);

  // Tear down the window once its (possibly extended) expiry passes, so a deliberate
  // manual flip is respected afterwards.
  const closeWindow = () => {
    const s = mammoOrientWindows.get(el);
    const remaining = s ? s.expiry - Date.now() : 0;
    if (remaining > 0) {
      setTimeout(closeWindow, remaining);
      return;
    }
    try {
      el.removeEventListener(Enums.Events.CAMERA_MODIFIED, onCameraModified);
    } catch {
      /* noop */
    }
    timers.forEach(clearTimeout);
    mammoOrientWindows.delete(el);
  };
  setTimeout(closeWindow, SETTLE_MS);
}
