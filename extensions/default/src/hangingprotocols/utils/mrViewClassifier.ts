/**
 * @author Sanjay Balai
 *
 * SINGLE SOURCE OF TRUTH for breast-MRI view classification.
 *
 * Given an OHIF MR display set, decide which faculty view (if any) it represents,
 * using real DICOM ACQUISITION TAGS rather than SeriesDescription text. On GE
 * (our data = GE SIGNA Explorer, VIBRANT-Flex) the description conflates unrelated
 * series (e.g. VIBRANT "WATER: Ph2" vs SUBTRACTION "SUB 2"/"PHASE 2"), which is why
 * a text-only matcher mislabels views. The tags below are unambiguous.
 *
 * Consumed by:
 *   - `mrViewType.ts`         → custom HP attribute `MRViewType` used in every
 *                               seriesMatchingRule (so pane matching == labels).
 *   - `mrViewAvailability.ts` → dropdown stage greying (same result as matching).
 *
 * View → tag rule (verified against real GE metadata):
 *   T1        ScanningSequence SE + ImageType ORIGINAL + EchoTime < 30 + AXIAL
 *   STIR      InversionTime 80–300 + not EP + no b-value + AXIAL
 *   DWI       DiffusionBValue present + ImageType != ADC
 *   ADC       ImageType contains ADC
 *   MIP_SI    ImageType MIP/PJN + description SI / S-I
 *   MIP_RL    ImageType MIP/PJN + description RL / R-L
 *   VIBRANT2  ImageType DIXON+WATER + AXIAL + TemporalPositionIdentifier == 2
 *   VIBRANT5  ImageType DIXON+WATER + AXIAL + TemporalPositionIdentifier == 5
 *   CORONAL   plane CORONAL (IOP) + not MIP        (whichever matches first)
 *   SAG_R     plane SAGITTAL + ImagePositionPatient X < 0  (patient's right breast)
 *   SAG_L     plane SAGITTAL + ImagePositionPatient X > 0  (patient's left breast)
 *
 * Duplicate series of the same view (repeat scans after motion/breath) are ranked
 * by INSTANCE COUNT elsewhere (see `mrInstanceCount.ts`) — not here.
 */

export type MRViewKey =
  | 'T1'
  | 'STIR'
  | 'MIP_SI'
  | 'MIP_RL'
  | 'VIBRANT2'
  | 'VIBRANT5'
  | 'CORONAL'
  | 'SAG_R'
  | 'SAG_L'
  | 'DWI'
  | 'ADC';

type AnyObj = Record<string, unknown>;

// A DICOM value may arrive as a scalar, a number array, or a backslash-joined
// string. Normalise to an UPPERCASE backslash string for token tests.
const asStr = (v: unknown): string => {
  if (v === undefined || v === null) {
    return '';
  }
  return (Array.isArray(v) ? v.join('\\') : String(v)).toUpperCase();
};

// First numeric value (scalar, first array element, or first token of a string).
const num = (v: unknown): number => {
  if (Array.isArray(v)) {
    return Number(v[0]);
  }
  if (typeof v === 'string') {
    return Number(v.split('\\')[0]);
  }
  return Number(v);
};

// The instance object where acquisition tags live (images[0] like mrPlane uses,
// falling back to instances[0], then the display set / plain object itself).
const tagSource = (ds: AnyObj): AnyObj =>
  ((Array.isArray(ds?.images) && (ds.images as AnyObj[])[0]) ||
    (Array.isArray(ds?.instances) && (ds.instances as AnyObj[])[0]) ||
    ds ||
    {}) as AnyObj;

// Acquisition plane from ImageOrientationPatient (slice normal → dominant axis).
function planeOf(iopRaw: unknown): 'AXIAL' | 'SAGITTAL' | 'CORONAL' | 'OBLIQUE' | 'UNKNOWN' {
  const iop = (Array.isArray(iopRaw) ? iopRaw : (iopRaw ?? '').toString().split('\\')).map(Number);
  if (iop.length < 6 || iop.some(n => Number.isNaN(n))) {
    return 'UNKNOWN';
  }
  const row = iop.slice(0, 3);
  const col = iop.slice(3, 6);
  const n = [
    row[1] * col[2] - row[2] * col[1],
    row[2] * col[0] - row[0] * col[2],
    row[0] * col[1] - row[1] * col[0],
  ];
  const a = n.map(Math.abs);
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
}

// Plane from the description's AX/SAG/COR token — the geometry-free fallback for
// series with no ImageOrientationPatient. On GE breast MR the plane token is
// authoritative for the reformat plane (only used when geometry is absent).
function planeFromDescToken(desc: string): 'AXIAL' | 'SAGITTAL' | 'CORONAL' | 'UNKNOWN' {
  if (/\bSAG\b|SAGITTAL/.test(desc)) {
    return 'SAGITTAL';
  }
  if (/\bCOR\b|CORONAL/.test(desc)) {
    return 'CORONAL';
  }
  if (/\bAX\b|AXIAL/.test(desc)) {
    return 'AXIAL';
  }
  return 'UNKNOWN';
}

/**
 * Classify one MR display set into a single faculty view key, or null when it is
 * not one of the panes (e.g. T2 FSE, an intermediate dynamic phase, a fat/in-phase
 * Dixon image, or an axial subtraction reformat).
 */
export function classifyMRDisplaySet(ds: AnyObj | null | undefined): MRViewKey | null {
  if (!ds) {
    return null;
  }
  // MR only (in the HP context Modality is on the display set).
  const modality = String((ds as AnyObj).Modality ?? '').toUpperCase();
  if (modality && modality !== 'MR' && modality !== 'MRI') {
    return null;
  }

  const src = tagSource(ds);
  const get = (k: string): unknown => src[k] ?? (ds as AnyObj)[k];

  const imageType = asStr(get('ImageType'));
  const scanSeq = asStr(get('ScanningSequence'));
  const ti = num(get('InversionTime'));
  const te = num(get('EchoTime'));
  const bValue = get('DiffusionBValue');
  const hasBValue = bValue !== undefined && bValue !== null && Number.isFinite(num(bValue));
  const tpi = num(get('TemporalPositionIdentifier'));
  const desc = asStr((ds as AnyObj).SeriesDescription ?? get('SeriesDescription'));

  // Acquisition plane. The AX/SAG/COR description token is AUTHORITATIVE for these
  // GE series (every acquisition and reformat is named by its plane), so it is used
  // FIRST — geometry is only the fallback when the description has no plane token.
  //
  // Why not geometry-first: OHIF hands the classifier a DEFAULT identity
  // orientation ([1,0,0,0,1,0]) for some DERIVED/REFORMATTED subtraction series
  // (e.g. "SUB 2 SAG R"), even though the DICOM/WADO metadata is sagittal. A
  // geometry-first rule trusts that fake axial IOP and hides the SAG/COR panes.
  // The plane token in the description never has that failure mode.
  const descPlane = planeFromDescToken(desc);
  const plane = descPlane !== 'UNKNOWN' ? descPlane : planeOf(get('ImageOrientationPatient'));

  const isEP = scanSeq.includes('EP'); // echo-planar (diffusion)

  // 1) ADC map — most specific derived type.
  if (imageType.includes('ADC')) {
    return 'ADC';
  }

  // 2) DWI — any diffusion series carrying a b-value (ADC already returned).
  if (hasBValue || (isEP && imageType.includes('DIFFUSION'))) {
    return 'DWI';
  }

  // 3) MIP — a projection image; SI vs RL from the (consistent) description token.
  if (imageType.includes('MIP') || imageType.includes('PJN')) {
    if (desc.includes('RL') || desc.includes('R/L') || desc.includes('R-L')) {
      return 'MIP_RL';
    }
    if (desc.includes('SI') || desc.includes('S/I') || desc.includes('S-I')) {
      return 'MIP_SI';
    }
    return null; // MIP with no direction token — leave the pane empty rather than guess
  }

  // 4) VIBRANT (post-contrast Dixon water dynamic). Ph2/Ph5 are the faculty PANES;
  //    every other phase is not a pane here (but still gets a "Vibrant N" LABEL via
  //    mrVibrantPhase → getViewLabel).
  if (imageType.includes('WATER') && plane === 'AXIAL') {
    const phase = Number.isFinite(tpi) ? tpi : phaseFromDesc(desc);
    if (phase === 2) {
      return 'VIBRANT2';
    }
    if (phase === 5) {
      return 'VIBRANT5';
    }
    return null;
  }

  // 5) STIR — inversion recovery with a short TI, not diffusion.
  if (Number.isFinite(ti) && ti >= 80 && ti <= 300 && !isEP && plane === 'AXIAL') {
    return 'STIR';
  }

  // 6) T1 — acquired spin-echo, short TE (T2 FSE has a long TE → not a pane).
  if (imageType.includes('ORIGINAL') && scanSeq.includes('SE') && !isEP && plane === 'AXIAL') {
    if (Number.isFinite(te) && te < 30) {
      return 'T1';
    }
    return null;
  }

  // 7) Coronal — any coronal reformat (whichever matches first / most instances).
  if (plane === 'CORONAL') {
    return 'CORONAL';
  }

  // 8) Sagittal — side from ImagePositionPatient X sign (LPS: X<0 = patient right).
  if (plane === 'SAGITTAL') {
    const side = sagittalSide(get('ImagePositionPatient'), desc);
    return side;
  }

  return null;
}

// Fallback phase parse from a GE VIBRANT description ("… Ph2 …", "… PHASE 2 …").
function phaseFromDesc(desc: string): number {
  const m = desc.match(/PH(?:ASE)?\s*([0-9]+)/);
  return m ? Number(m[1]) : NaN;
}

/**
 * Dynamic phase number of a GE VIBRANT (Dixon WATER, axial) series — from
 * TemporalPositionIdentifier, falling back to a "Ph<N>"/"PHASE <N>" description
 * token. Returns null for non-vibrant series (and vibrant series with no phase,
 * e.g. the all-phase container). Ph2/Ph5 drive the hanging-protocol panes; EVERY
 * phase (1/2/3/4/5/…) drives the "Vibrant N" viewport label.
 */
export function mrVibrantPhase(ds: AnyObj | null | undefined): number | null {
  if (!ds) {
    return null;
  }
  const src = tagSource(ds);
  const get = (k: string): unknown => src[k] ?? (ds as AnyObj)[k];
  const imageType = asStr(get('ImageType'));
  const plane = planeOf(get('ImageOrientationPatient'));
  if (!imageType.includes('WATER') || plane !== 'AXIAL') {
    return null;
  }
  const tpi = num(get('TemporalPositionIdentifier'));
  const desc = asStr((ds as AnyObj).SeriesDescription ?? get('SeriesDescription'));
  const phase = Number.isFinite(tpi) ? tpi : phaseFromDesc(desc);
  return Number.isFinite(phase) ? phase : null;
}

/**
 * Post-contrast SUBTRACTION phase of a derived MR series, or null when the series
 * is not a subtraction. Subtractions are the post-contrast dynamic minus the
 * pre-contrast mask. GE names them three different ways, so all three are matched:
 *   - ImageType contains SUBTRACTION
 *   - a "SUB <n>" token in the description ("SUB 2 COR RFM")
 *   - the derived "(patient/seriesA/…)-(patient/seriesB/…)" math naming GE puts on
 *     the axial subtraction stacks (e.g. "(10037/801/1..188)-(10037/800/1..188)")
 * Returns the dynamic phase number (from TemporalPositionIdentifier, falling back
 * to a "Ph<n>"/"PHASE <n>" / "SUB <n>" token), or 'unknown' for a subtraction with
 * no resolvable phase. Non-subtraction series return null.
 */
export function mrSubtractionPhase(ds: AnyObj | null | undefined): number | 'unknown' | null {
  if (!ds) {
    return null;
  }
  const src = tagSource(ds);
  const get = (k: string): unknown => src[k] ?? (ds as AnyObj)[k];
  const imageType = asStr(get('ImageType'));
  const desc = asStr((ds as AnyObj).SeriesDescription ?? get('SeriesDescription'));
  const isSubtraction =
    imageType.includes('SUBTRACTION') ||
    /\bSUB\b/.test(desc) ||
    /\([^)]+\)\s*-\s*\([^)]+\)/.test(desc);
  if (!isSubtraction) {
    return null;
  }
  const tpi = num(get('TemporalPositionIdentifier'));
  let phase = Number.isFinite(tpi) ? tpi : phaseFromDesc(desc);
  if (!Number.isFinite(phase)) {
    const m = desc.match(/\bSUB\s*([0-9]+)/);
    phase = m ? Number(m[1]) : NaN;
  }
  return Number.isFinite(phase) ? phase : 'unknown';
}

/**
 * True when the series is a GE VIBRANT dynamic (post-contrast Dixon WATER, axial)
 * regardless of whether a phase number is resolvable — used to label the
 * pre-contrast / all-phase water container that carries no TemporalPositionIdentifier.
 */
export function isVibrantWater(ds: AnyObj | null | undefined): boolean {
  if (!ds) {
    return false;
  }
  const src = tagSource(ds);
  const get = (k: string): unknown => src[k] ?? (ds as AnyObj)[k];
  return asStr(get('ImageType')).includes('WATER') && planeOf(get('ImageOrientationPatient')) === 'AXIAL';
}

// Sagittal breast side. The explicit R/L token in a GE reformat description
// ("SAG L", "…REFT RT", "SUB 2 SAG R", "Sag …- L") is the AUTHORITATIVE side — a
// per-side reformat's stored ImagePositionPatient can disagree with its label, so
// geometry is only the fallback when no side token exists (e.g. a bilateral
// "WATER: Sag Vibrant-Flex"). \b word-boundaries keep the R in "REFT"/"RFMT" and
// the L in "LAVA" from false-matching.
function sagittalSide(ippRaw: unknown, desc: string): MRViewKey | null {
  const hasR = /\b(RT|R)\b/.test(desc);
  const hasL = /\b(LT|L)\b/.test(desc);
  if (hasR && !hasL) {
    return 'SAG_R';
  }
  if (hasL && !hasR) {
    return 'SAG_L';
  }
  // No explicit (or ambiguous) side — patient's RIGHT breast sits at negative X.
  const x = num(Array.isArray(ippRaw) ? ippRaw : (ippRaw ?? '').toString().split('\\'));
  if (Number.isFinite(x) && x !== 0) {
    return x < 0 ? 'SAG_R' : 'SAG_L';
  }
  return null;
}
