/**
 * Per-instance clinical view-label detector.
 *
 * Returns a short clinical view label (e.g. "RCC", "LMLO", "Axial T1",
 * "Sagittal Post", "MIP", "Coronal", "R LONG") derived from DICOM tags.
 * Tolerant to missing tags — falls through to `null` if it cannot decide,
 * so a detection miss never produces a misleading label.
 *
 * This is the same view-label logic the per-viewport overlay uses (see
 * extensions/cornerstone/src/customizations/viewportOverlayCustomization.tsx).
 * It's duplicated here so that PanelStudyBrowser can show consistent view
 * labels on sidebar cards without needing extension-default to depend on
 * extension-cornerstone (which would risk circular deps in this monorepo).
 *
 * Source priority mirrors the hanging-protocol display-set selectors in
 * `hangingprotocols/utils/{mammo,mr}DisplaySetSelector.ts`, so the labels
 * stay consistent with how the protocols pick viewports.
 */
export function getViewLabel(instance: any): string | null {
  if (!instance) {
    return null;
  }
  try {
    const modality = String(instance.Modality || '').toUpperCase();
    if (modality === 'MG') {
      return getMammoViewLabel(instance);
    }
    if (modality === 'MR' || modality === 'MRI') {
      return getMRViewLabel(instance);
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

  // ViewCodeSequence (SCT codes) — same constants as mammoDisplaySetSelector.ts.
  if (!view && instance.ViewCodeSequence) {
    const seq = Array.isArray(instance.ViewCodeSequence)
      ? instance.ViewCodeSequence[0]
      : instance.ViewCodeSequence;
    const code = String(seq?.CodeValue || '').trim();
    if (code === '399162004' || code === 'R-10242') {
      view = 'CC';
    } else if (code === '399368009' || code === 'R-102D2') {
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

  // CEM (Contrast-Enhanced Mammography) — "recombined" image type.
  const isCEM =
    matchesImageType(instance.ImageType, ['RECOMBINED', 'SUBTRACTED', 'CEM']) ||
    /\b(CEM|CESM|RECOMBINED)\b/.test(desc);

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
  return label;
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

/** MRI / Breast MR — plane (from IOP) + sequence (from desc/TE/ImageType). */
function getMRViewLabel(instance: any): string | null {
  const plane = getPlaneFromIOP(instance.ImageOrientationPatient);
  const sequence = getMRSequence(instance);

  if (plane && sequence) {
    return `${plane} ${sequence}`;
  }
  if (sequence) {
    return sequence;
  }
  if (plane) {
    return plane;
  }
  return null;
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
  // TE-based fallback when SeriesDescription is empty/dummy.
  if (!isNaN(te)) {
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
