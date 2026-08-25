import {
  classifyMRDisplaySet,
  mrVibrantPhase,
  mrSubtractionPhase,
  isVibrantWater,
  type MRViewKey,
} from '../hangingprotocols/utils/mrViewClassifier';

/**
 * Per-instance clinical view-label detector.
 *
 * Returns a short clinical view label (e.g. "RCC", "LMLO", "T1", "STIR",
 * "Vibrant 2", "MIP SI", "Coronal", "Sag R") derived from DICOM tags.
 * Tolerant to missing tags — falls through to `null` if it cannot decide,
 * so a detection miss never produces a misleading label.
 *
 * Used by BOTH the per-viewport overlay (via `@ohif/extension-default`) and the
 * PanelStudyBrowser sidebar cards, so labels stay consistent everywhere.
 *
 * For breast MR the label comes from the SAME tag-based classifier the hanging
 * protocol uses to place series (`hangingprotocols/utils/mrViewClassifier.ts`),
 * so a viewport's label always matches the faculty view it was filled with.
 */
export function getViewLabel(instance: any): string | null {
  if (!instance) {
    return null;
  }
  try {
    const modality = String(instance.Modality || '').toUpperCase();
    // MR FIRST — GE stores derived breast-MR series (subtractions, MIPs, reformats)
    // as Secondary Capture SOP Class (…1.1.7), the SAME SOP Class the mammography AI
    // overlays use. So the "AI Image" rule below MUST NOT see MR, or every GE MR
    // subtraction stack gets mislabelled "AI Image". MR is classified purely from
    // its acquisition tags instead.
    if (modality === 'MR' || modality === 'MRI') {
      return getMRViewLabel(instance);
    }
    // AI overlays (e.g. Lunit) are wrapped as Secondary Capture (Modality 'MG' /
    // 'XC' / 'OT', no ImageLaterality). Label them explicitly as "AI Image" rather
    // than a derived view (RCC/MLO/…), which would be meaningless for an overlay.
    if (instance.SOPClassUID === '1.2.840.10008.5.1.4.1.1.7') {
      return 'AI Image';
    }
    if (modality === 'MG') {
      return getMammoViewLabel(instance);
    }
    if (modality === 'US') {
      return getUSViewLabel(instance);
    }
    if (modality === 'CT' || modality === 'XA' || modality === 'CR' || modality === 'DX') {
      const plane = getPlaneFromIOP(instance.ImageOrientationPatient);
      if (plane) {
        return plane;
      }
      const desc = String(instance.SeriesDescription || '').trim();
      return desc && desc.length <= 30 ? desc : null;
    }
    // Unknown modality — show a compact SeriesDescription if it's clean.
    const desc = String(instance.SeriesDescription || '').trim();
    return desc && desc.length <= 30 ? desc : null;
  } catch {
    return null;
  }
}

/** Mammography (MG, DBT, CEM all share Modality=MG). */
function getMammoViewLabel(instance: any): string | null {
  // 1) Laterality: ImageLaterality is authoritative when present.
  let lat = String(instance.ImageLaterality || '').toUpperCase();
  // 2) View: ViewPosition tag (CC, MLO, ML, LM, LMO, FB, AT, XCCL, XCCM).
  let view = String(instance.ViewPosition || '').toUpperCase();

  // ViewCodeSequence — CC codes: SNOMED 399162004, SRT R-10242. MLO codes:
  // SNOMED 399368009, SRT R-102D2 AND R-10226 (some vendors — e.g. this GE CEM —
  // emit R-10226 for MLO, which was unrecognised and left CC/MLO indistinguishable
  // when ViewPosition + SeriesDescription were also absent). CodeMeaning is used
  // as a vendor-agnostic fallback so any future code variant still resolves.
  if (!view && instance.ViewCodeSequence) {
    const seq = Array.isArray(instance.ViewCodeSequence)
      ? instance.ViewCodeSequence[0]
      : instance.ViewCodeSequence;
    const code = String(seq?.CodeValue || '').trim();
    const meaning = String(seq?.CodeMeaning || '').toUpperCase();
    if (code === '399162004' || code === 'R-10242' || /CRANIO|\bCC\b/.test(meaning)) {
      view = 'CC';
    } else if (
      code === '399368009' ||
      code === 'R-102D2' ||
      code === 'R-10226' ||
      /OBLIQUE|\bMLO\b/.test(meaning)
    ) {
      view = 'MLO';
    }
  }

  // SeriesDescription parsing — last resort. Match longest tokens first so
  // "LMLO" wins over "MLO" and "XCCL" wins over "CC".
  const desc = String(instance.SeriesDescription || '').toUpperCase();
  if (!view) {
    const tokens = [
      'XCCL',
      'XCCM',
      'LMLO',
      'RMLO',
      'LCC',
      'RCC',
      'MLO',
      'CC',
      'ML',
      'LM',
      'FB',
      'AT',
    ];
    for (const t of tokens) {
      if (desc.includes(t)) {
        view = t.length === 4 ? t.slice(1) : t; // 'LMLO' → 'MLO', 'RCC' → 'CC'
        if (!lat && t.length === 4) {
          lat = t[0]; // recover laterality from prefix
        }
        if (!lat && (t === 'LCC' || t === 'RCC')) {
          lat = t[0];
        }
        break;
      }
    }
  }

  // Laterality fallback from SeriesDescription word-boundaries.
  if (!lat) {
    if (/\b(L|LT|LEFT)\b/.test(desc) || /^L[\s_-]/.test(desc)) {
      lat = 'L';
    } else if (/\b(R|RT|RIGHT)\b/.test(desc) || /^R[\s_-]/.test(desc)) {
      lat = 'R';
    }
  }

  // DBT (Digital Breast Tomosynthesis) — SOP Class wins; ImageType is a fallback.
  const isDBT =
    instance.SOPClassUID === '1.2.840.10008.5.1.4.1.1.13.1.3' ||
    /\b(TOMO|TOMOSYNTHESIS|3D|DBT)\b/.test(desc) ||
    matchesImageType(instance.ImageType, ['TOMO', 'TOMOSYNTHESIS']);

  // CEM (Contrast-Enhanced Mammography) — the contrast image type varies by
  // vendor: RECOMBINED (Hologic) / SUBTRACTION (GE "DES") / IODINE / CESM.
  const isCEM =
    matchesImageType(instance.ImageType, [
      'RECOMBINED',
      'SUBTRACTION',
      'SUBTRACTED',
      'IODINE',
      'CESM',
    ]) || /\b(CEM|CESM|RECOMBINED|DES)\b/.test(desc);

  let label = '';
  if (lat && view) {
    label = `${lat}${view}`;
  } else if (view) {
    label = view;
  } else if (lat) {
    label = lat;
  }

  if (!label) {
    if (isDBT) {
      return 'DBT';
    }
    if (isCEM) {
      return 'CEM';
    }
    return null;
  }

  if (isDBT) {
    label += ' DBT';
  } else if (isCEM) {
    label += ' CEM';
  }
  // Distinguish special diagnostic acquisitions (spot compression, magnification,
  // rolled, cleavage, …) so a manually-loaded modified view is identifiable and
  // never silently reads like the standard screening view, e.g. "RMLO Spot Mag".
  label += getViewModifierSuffix(instance);
  // Fallback for vendors that DON'T populate ViewModifierCodeSequence (common on
  // anonymized files): derive the same Spot/Mag/Stereo/Biopsy tag from
  // PaddleDescription + ImageType, so these images read e.g. "RCC Mag Spot" or
  // "RMLO Stereo Biopsy" in the sidebar/overlay instead of looking like a normal
  // view. Same signals the hanging-protocol exclusion uses (getSopClassHandlerModule).
  label += getSpecialAcquisitionSuffix(instance, label);
  return label;
}

/**
 * Spot / magnification / stereotactic-biopsy suffix derived from PaddleDescription
 * (0018,11A4) and ImageType (0008,0008) — the signals that survive anonymization
 * when ViewModifierCodeSequence is stripped. De-duplicated against whatever
 * getViewModifierSuffix already appended (so a view is never tagged "Spot Spot").
 * Returns '' for a standard full-field view.
 */
function getSpecialAcquisitionSuffix(instance: any, existing: string): string {
  const rawImageType = instance?.ImageType;
  const imageType = (
    Array.isArray(rawImageType) ? rawImageType.join('\\') : String(rawImageType || '')
  ).toUpperCase();
  const paddle = String(instance?.PaddleDescription || '').toUpperCase();

  const parts: string[] = [];
  if (/STEREO/.test(imageType)) {
    parts.push('Stereo');
  }
  if (/BIOPSY/.test(paddle)) {
    parts.push('Biopsy');
  }
  if (/\bMAG\b/.test(paddle)) {
    parts.push('Mag');
  }
  if (/SPOT|\bSP\b/.test(paddle)) {
    parts.push('Spot');
  }

  const seen = new Set<string>();
  const uniq = parts.filter(p =>
    existing.toUpperCase().includes(p.toUpperCase()) ? false : seen.has(p) ? false : (seen.add(p), true)
  );
  return uniq.length ? ` ${uniq.join(' ')}` : '';
}

/**
 * Short suffix describing the view modifiers (0054,0222 ViewModifierCodeSequence)
 * on a mammography image. Returns '' for a standard screening view (no
 * modifiers). Mirrors the `ViewModifier` hanging-protocol attribute, but maps
 * the modifier codes/meanings to compact human labels for display.
 */
function getViewModifierSuffix(instance: any): string {
  const seq = instance?.ViewCodeSequence;
  const viewCode = Array.isArray(seq) ? seq[0] : seq;
  let mods = viewCode?.ViewModifierCodeSequence;
  if (!mods) {
    return '';
  }
  mods = Array.isArray(mods) ? mods : [mods];

  const parts: string[] = [];
  for (const m of mods) {
    const meaning = String(m?.CodeMeaning || '').toUpperCase();
    const code = String(m?.CodeValue || '').toUpperCase();
    if (meaning.includes('SPOT') || meaning.includes('COMPRESS') || code === 'R-102D7') {
      parts.push('Spot');
    } else if (meaning.includes('MAGNIF') || code === 'R-102D6') {
      parts.push('Mag');
    } else if (meaning.includes('ROLL')) {
      parts.push('Roll');
    } else if (meaning.includes('CLEAVAGE')) {
      parts.push('Cleavage');
    } else if (meaning.includes('TANGENT')) {
      parts.push('Tangential');
    } else if (meaning.includes('IMPLANT') && meaning.includes('DISPLAC')) {
      parts.push('ID'); // implant-displaced (Eklund)
    }
  }

  // De-duplicate while preserving order (a single view can repeat a modifier).
  const seen = new Set<string>();
  const uniq = parts.filter(p => (seen.has(p) ? false : (seen.add(p), true)));
  return uniq.length ? ` ${uniq.join(' ')}` : '';
}

// Human labels for the breast-MRI faculty views (the hanging-protocol panes).
const MR_VIEW_LABEL: Record<MRViewKey, string> = {
  T1: 'T1',
  STIR: 'STIR',
  MIP_SI: 'MIP SI',
  MIP_RL: 'MIP RL',
  VIBRANT2: 'Vibrant 2',
  VIBRANT5: 'Vibrant 5',
  CORONAL: 'Coronal',
  SAG_R: 'Sag R',
  SAG_L: 'Sag L',
  DWI: 'DWI',
  ADC: 'ADC',
};

/** MRI / Breast MR — faculty view from the tag-based classifier (same source as
 *  the hanging protocol), falling back to plane + sequence for series that are
 *  not one of the panes (T2, priors, intermediate dynamic phases, …). */
function getMRViewLabel(instance: any): string | null {
  // The exact view key the hanging protocol would place this series in, so a
  // viewport's label can never disagree with the pane it fills. (T1/STIR/DWI/ADC/
  // MIP_*/CORONAL/SAG_R/SAG_L — or null for non-pane series.)
  const viewKey = classifyMRDisplaySet(instance);
  // Dynamic phase of a GE VIBRANT (post-contrast Dixon WATER) series, and of a
  // post-contrast SUBTRACTION series — used to number the "Vibrant N" / "SUB N"
  // labels exactly.
  const vibrantPhase = mrVibrantPhase(instance);
  const subPhase = mrSubtractionPhase(instance);

  let smart: string | null = null;

  // 1) Unambiguous derived types read straight from the classifier.
  if (viewKey === 'ADC' || viewKey === 'DWI' || viewKey === 'MIP_SI' || viewKey === 'MIP_RL') {
    smart = MR_VIEW_LABEL[viewKey];
  }
  // 2) Post-contrast subtraction — prefix the reformat plane/side (from the same
  //    classifier) so faculty see "Coronal SUB 2", "Sag R SUB 2", or "Axial SUB 1".
  else if (subPhase != null) {
    const n = typeof subPhase === 'number' ? ` ${subPhase}` : '';
    if (viewKey === 'CORONAL') {
      smart = `Coronal SUB${n}`;
    } else if (viewKey === 'SAG_R') {
      smart = `Sag R SUB${n}`;
    } else if (viewKey === 'SAG_L') {
      smart = `Sag L SUB${n}`;
    } else {
      smart = `Axial SUB${n}`;
    }
  }
  // 3) VIBRANT dynamic — Ph1→"Vibrant 1" … Ph5→"Vibrant 5"; the pre-contrast /
  //    all-phase water container (no phase tag) reads plain "Vibrant".
  else if (vibrantPhase != null) {
    smart = `Vibrant ${vibrantPhase}`;
  } else if (isVibrantWater(instance)) {
    smart = 'Vibrant';
  }
  // 4) Remaining pane views (T1 / STIR / CORONAL / SAG_R / SAG_L for non-subtraction).
  else if (viewKey) {
    smart = MR_VIEW_LABEL[viewKey];
  }
  // 5) Fallback for anything else (T2 FSE, priors): plane (from IOP) + coarse sequence.
  else {
    const plane = getPlaneFromIOP(instance.ImageOrientationPatient);
    const sequence = getMRSequence(instance);
    smart = plane && sequence ? `${plane} ${sequence}` : sequence || plane;
  }

  // ALWAYS surface the ORIGINAL SeriesDescription alongside the derived label, so
  // every series reads "<view> - <original description>" — e.g.
  // "Vibrant 5 - WATER: Ph5/Ax Vibrant-Flex …", "Axial SUB 5 - (10037/805/…)-(…/800/…)",
  // "STIR - Ax T2 STIR". Faculty asked for both on every series (the derived view to
  // identify it, the raw description to cross-check). Only skipped when it would just
  // duplicate the label (e.g. desc already "T1").
  const desc = String(instance.SeriesDescription || '').trim();
  if (smart && desc && desc.toUpperCase() !== smart.toUpperCase()) {
    return `${smart} - ${desc}`;
  }
  return smart || desc || null;
}

function getMRSequence(instance: any): string | null {
  const desc = String(instance.SeriesDescription || '').toUpperCase();
  const te = parseFloat(instance.EchoTime);

  if (matchesImageType(instance.ImageType, ['MIP']) || /\bMIP\b/.test(desc)) {
    return 'MIP';
  }
  if (matchesImageType(instance.ImageType, ['SUBTRACTION']) || /\bSUB\b/.test(desc)) {
    return 'SUB';
  }
  if (/\bSTIR\b/.test(desc)) {
    return 'STIR';
  }
  if (/\bFLAIR\b/.test(desc)) {
    return 'FLAIR';
  }
  if (/\b(DWI|DIFFUSION)\b/.test(desc)) {
    return 'DWI';
  }
  if (/\bADC\b/.test(desc)) {
    return 'ADC';
  }
  if (/\b(POST|DCE|GD|DELAYED)\b/.test(desc)) {
    return 'T1 Post';
  }
  if (/\bT2\b|T2W/.test(desc)) {
    return 'T2';
  }
  if (/\bT1\b|T1W/.test(desc)) {
    if (/\b(PRE|BASELINE)\b/.test(desc)) {
      return 'T1 Pre';
    }
    return 'T1';
  }
  // TE-based fallback when SeriesDescription is empty/dummy — ONLY for ORIGINAL
  // (acquired) images. Derived series (subtraction, water, reformats) carry a tiny
  // gradient-echo TE that would otherwise be misread as "T1"; they are handled by
  // the subtraction / vibrant branches upstream, so here they must return null
  // rather than guess a weighting they don't have.
  if (!isNaN(te) && matchesImageType(instance.ImageType, ['ORIGINAL'])) {
    if (te < 20) {
      return 'T1';
    }
    if (te > 60) {
      return 'T2';
    }
  }
  return null;
}

/** Ultrasound — laterality + scan plane keyword. */
function getUSViewLabel(instance: any): string | null {
  const desc = String(instance.SeriesDescription || '').toUpperCase();
  const lat = String(instance.ImageLaterality || '').toUpperCase();

  let plane: string | null = null;
  if (/\b(TRANS|TRV|TRANSVERSE|AXIAL|AX)\b/.test(desc)) {
    plane = 'TRANS';
  } else if (/\b(LONG|LONGITUDINAL|SAG|SAGITTAL)\b/.test(desc)) {
    plane = 'LONG';
  }

  if (lat && plane) {
    return `${lat} ${plane}`;
  }
  if (plane) {
    return plane;
  }
  if (lat) {
    return `${lat} US`;
  }
  return null;
}

/**
 * Derive imaging plane from ImageOrientationPatient (0020,0037).
 * IOP is 6 floats: first 3 = row cosine, last 3 = column cosine.
 * The cross product gives the slice-normal in patient coordinates;
 * the dominant axis of that vector identifies the plane.
 */
function getPlaneFromIOP(iop: any): string | null {
  if (!iop) {
    return null;
  }
  let arr: number[];
  if (typeof iop === 'string') {
    arr = iop.split('\\').map(Number);
  } else if (Array.isArray(iop)) {
    arr = iop.map(Number);
  } else {
    return null;
  }
  if (arr.length < 6 || arr.some(isNaN)) {
    return null;
  }

  const r = arr.slice(0, 3);
  const c = arr.slice(3, 6);
  const n = [
    r[1] * c[2] - r[2] * c[1],
    r[2] * c[0] - r[0] * c[2],
    r[0] * c[1] - r[1] * c[0],
  ].map(Math.abs);
  const maxIdx = n.indexOf(Math.max(...n));
  // x-dominant normal → sagittal; y → coronal; z → axial.
  if (maxIdx === 0) {
    return 'Sagittal';
  }
  if (maxIdx === 1) {
    return 'Coronal';
  }
  if (maxIdx === 2) {
    return 'Axial';
  }
  return null;
}

/** ImageType can be a backslash-string, array, or array-of-codes. */
function matchesImageType(imageType: any, needles: string[]): boolean {
  if (!imageType) {
    return false;
  }
  const flat = Array.isArray(imageType) ? imageType.join('|') : String(imageType);
  const up = flat.toUpperCase();
  return needles.some(n => up.includes(n.toUpperCase()));
}

/**
 * Resolve the per-instance source for `getViewLabel` from a display set.
 * displaySet exposes its first instance via `getImage(0)`; fall back to the
 * displaySet itself if it already carries the instance-level DICOM tags.
 */
export function getDisplaySetInstance(ds: any): any {
  if (!ds) {
    return null;
  }
  if (typeof ds.getImage === 'function') {
    try {
      const inst = ds.getImage(0);
      if (inst) {
        return inst;
      }
    } catch {
      /* fall through */
    }
  }
  if (Array.isArray(ds.images) && ds.images[0]) {
    return ds.images[0];
  }
  if (Array.isArray(ds.instances) && ds.instances[0]) {
    return ds.instances[0];
  }
  return ds;
}
