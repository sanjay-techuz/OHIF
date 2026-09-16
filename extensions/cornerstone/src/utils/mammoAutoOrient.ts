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

// Same narrow predicate as extensions/default/src/utils/isTomosynthesisSlice.ts,
// inlined here to keep this cornerstone util free of a cross-extension import.
const isSecondaryCaptureTomo = (instance: any): boolean => {
  if (!instance || instance.SOPClassUID !== SECONDARY_CAPTURE_SOP_CLASS) {
    return false;
  }
  const raw = instance.ImageType;
  const imageType = (Array.isArray(raw) ? raw.join('\\') : String(raw || '')).toUpperCase();
  return /\bVOLUME\b/.test(imageType) || imageType.includes('TOMOSYNTHESIS');
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
    // Gate strictly to the SC-wrapped tomo slices — the only series that are
    // mis-stored. Everything else is left exactly as authored.
    if (!isSecondaryCaptureTomo(instance)) {
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

  const run = () => applyRadiologicalOrientationMammo(viewport);
  run();
  [150, 400, 800, 1300, 2000].forEach(ms => setTimeout(run, ms));

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
      applyRadiologicalOrientationMammo(viewport);
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
