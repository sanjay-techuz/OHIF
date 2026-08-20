/**
 * @author Sanjay Balai
 * @description CEM (Contrast-Enhanced Mammography) display-set selectors.
 *
 * CEM acquisitions produce TWO image volumes per (laterality, view):
 *   - Low-Energy (LE)       → ImageType[3] === 'LOW_ENERGY'
 *                             — visually equivalent to standard 2D MG
 *   - Recombined / Iodine   → ImageType[3] === 'RECOMBINED'
 *                             — the contrast subtraction image
 *
 * The discriminator is `(0008,0008) ImageType`. Side and view fall back
 * to the same rules used by `mammoDisplaySetSelector.ts` so CEM benefits
 * from the same tag-tolerance work that's already proven on real cases.
 *
 * `DummySeriesDesc!` is intentionally included alongside real strings so
 * anonymised demo studies still match — same precedent as mammoDisplaySetSelector.
 */

// Current vs prior are separated exactly like mammoDisplaySetSelector: by the
// study's position in the studies array. The manual "Compare with prior" flow
// (study browser) hands the HP service [openedStudy, pickedStudy], so index 0
// is always the current study and index 1 is always the prior. Keeping the CEM
// mechanism identical to mammo means one code path governs current/prior for
// every breast modality.
const currentStudyMatchingRules = [
  {
    attribute: 'studyInstanceUIDsIndex',
    from: 'options',
    required: true,
    constraint: {
      equals: { value: 0 },
    },
  },
];

const priorStudyMatchingRules = [
  {
    attribute: 'studyInstanceUIDsIndex',
    from: 'options',
    required: true,
    constraint: {
      equals: { value: 1 },
    },
  },
];

// Same standard-vs-modified tie-breaker used by mammoDisplaySetSelector: a
// plain CC/MLO acquisition has no ViewModifierCodeSequence, a spot/mag view
// does. This optional bonus keeps a standard view ahead of a same-(laterality,
// view) spot/mag acquisition. Weight stays below the laterality weight (25) so
// it only breaks a same-view tie and never disturbs cross-view ranking.
const standardViewBonusRule = {
  weight: 15,
  attribute: 'ViewModifier',
  required: false,
  constraint: { equals: 'NONE' },
};

// --- Modality + ImageType filters shared by every CEM selector. ---
//
// Modality is reported as 'MG' for CEM (DICOM doesn't have a separate CEM
// modality code). The CEM-specific signal is ImageType[3]. We split into
// two arrays so the laterality+view rules below can append either LE or
// RECOMBINED.
// The CEM contrast image's ImageType[3] varies by VENDOR:
//   Hologic  → 'RECOMBINED'
//   GE       → 'SUBTRACTION'  (shown as "DES" = Dual-Energy Subtracted in desc)
//   others   → 'IODINE' / 'CESM'
// Match any of them so the contrast pane isn't left showing the LE image.
const CEM_CONTRAST_IMAGETYPE = ['RECOMBINED', 'SUBTRACTION', 'IODINE', 'CESM'];
// Secondary (description) hints, case-insensitive, used only to break ties when
// ImageType is ambiguous. LE desc usually ends " LE"; contrast desc " DES" etc.
const CEM_CONTRAST_DESC = ['DES', 'RECOMBINED', 'RECOMB', 'CESM', 'IODINE', 'I-VIEW', 'IVIEW', 'CONTRAST'];
const CEM_LE_DESC = ['LE', 'LOW ENERGY', 'LOW-ENERGY', 'LOWENERGY'];

const cemLECommonRules = [
  { weight: 30, attribute: 'Modality', constraint: { equals: 'MG' } },
  { weight: 25, attribute: 'ImageType', constraint: { contains: 'LOW_ENERGY' } },
  // Keep LE OFF the contrast image so the LE pane never grabs the recombined one.
  {
    weight: 20,
    attribute: 'ImageType',
    required: false,
    constraint: { doesNotContain: CEM_CONTRAST_IMAGETYPE },
  },
  { weight: 8, attribute: 'SeriesDescription', required: false, constraint: { containsI: CEM_LE_DESC } },
];

const cemRecombinedCommonRules = [
  { weight: 30, attribute: 'Modality', constraint: { equals: 'MG' } },
  // The load-bearing CEM contrast tag — RECOMBINED / SUBTRACTION / IODINE / CESM.
  { weight: 25, attribute: 'ImageType', constraint: { contains: CEM_CONTRAST_IMAGETYPE } },
  // Keep recombined OFF the LE image so the two panes never collapse to the same view.
  {
    weight: 20,
    attribute: 'ImageType',
    required: false,
    constraint: { doesNotContain: ['LOW_ENERGY'] },
  },
  {
    weight: 8,
    attribute: 'SeriesDescription',
    required: false,
    constraint: { containsI: CEM_CONTRAST_DESC },
  },
];

// Primary CC-vs-MLO discriminator: `MammoView` is derived from ViewPosition
// (0018,5101) — the SAME tag the sidebar (getMammoViewLabel) uses — so it tells
// CC from MLO even when the DICOM has NO ViewCodeSequence and the
// SeriesDescription doesn't spell out the view. Without this, a study that
// carries only ViewPosition (labels look right in the sidebar) but plain
// descriptions couldn't distinguish CC from MLO — only R/L — so RCC/LCC landed
// in the RMLO/LMLO panes (seen on production, not local where descriptions say
// "R MLO" etc.). Weight 100 (above the sum of the other view rules) so the
// correct view always wins its pane; required:false so a missing ViewPosition
// degrades gracefully to the description/laterality rules below.
// `containsI` (not `equals`): getMammoViewLabel appends a " CEM" suffix for the
// contrast image, so MammoView is "RMLO" for the LE pane but "RMLO CEM" for the
// recombined pane. A substring match handles both. The full RCC/LCC/RMLO/LMLO
// tokens are distinct (RMLO≠LMLO≠RCC≠LCC), so this can't cross-match.
const cemMammoViewRule = (view: string) => ({
  weight: 100,
  attribute: 'MammoView',
  required: false,
  constraint: { containsI: [view] },
});

// --- Laterality + view fragments. Reused for both LE and Recombined. ---

const RCCViewRules = [
  cemMammoViewRule('RCC'),
  {
    weight: 10,
    attribute: 'ViewCode',
    required: false,
    constraint: { contains: ['SCT:399162004', 'R-10242'] },
  },
  {
    weight: 20,
    attribute: 'SeriesDescription',
    required: false,
    constraint: { contains: ['RCC', 'R CC', 'CC', 'CSTTemp', 'DummySeriesDesc!'] },
  },
  {
    weight: 25,
    attribute: 'ImageLaterality',
    required: false,
    constraint: { equals: 'R' },
  },
  standardViewBonusRule,
];

const LCCViewRules = [
  cemMammoViewRule('LCC'),
  {
    weight: 10,
    attribute: 'ViewCode',
    required: false,
    constraint: { contains: ['SCT:399162004', 'R-10242'] },
  },
  {
    weight: 20,
    attribute: 'SeriesDescription',
    required: false,
    constraint: { contains: ['LCC', 'L CC', 'CC', 'CSTTemp', 'DummySeriesDesc!'] },
  },
  {
    weight: 25,
    attribute: 'ImageLaterality',
    required: false,
    constraint: { equals: 'L' },
  },
  standardViewBonusRule,
];

const RMLOViewRules = [
  cemMammoViewRule('RMLO'),
  {
    weight: 10,
    attribute: 'ViewCode',
    required: false,
    constraint: { contains: ['SCT:399368009', 'R-102D2'] },
  },
  {
    weight: 20,
    attribute: 'SeriesDescription',
    required: false,
    constraint: { contains: ['RMLO', 'R MLO', 'MLO', 'XRF02', 'DummySeriesDesc!'] },
  },
  {
    weight: 25,
    attribute: 'ImageLaterality',
    required: false,
    constraint: { equals: 'R' },
  },
  standardViewBonusRule,
];

const LMLOViewRules = [
  cemMammoViewRule('LMLO'),
  {
    weight: 10,
    attribute: 'ViewCode',
    required: false,
    constraint: { contains: ['SCT:399368009', 'R-102D2'] },
  },
  {
    weight: 20,
    attribute: 'SeriesDescription',
    required: false,
    constraint: { contains: ['LMLO', 'L MLO', 'MLO', 'XRF02', 'DummySeriesDesc!'] },
  },
  {
    weight: 25,
    attribute: 'ImageLaterality',
    required: false,
    constraint: { equals: 'L' },
  },
  standardViewBonusRule,
];

// --- 8 selectors: 4 LE + 4 Recombined ---

const buildSelector = (commonRules: unknown[], viewRules: unknown[]) => ({
  seriesMatchingRules: [...commonRules, ...viewRules],
  studyMatchingRules: currentStudyMatchingRules,
});

const RCC_LE = buildSelector(cemLECommonRules, RCCViewRules);
const LCC_LE = buildSelector(cemLECommonRules, LCCViewRules);
const RMLO_LE = buildSelector(cemLECommonRules, RMLOViewRules);
const LMLO_LE = buildSelector(cemLECommonRules, LMLOViewRules);

const RCC_Recomb = buildSelector(cemRecombinedCommonRules, RCCViewRules);
const LCC_Recomb = buildSelector(cemRecombinedCommonRules, LCCViewRules);
const RMLO_Recomb = buildSelector(cemRecombinedCommonRules, RMLOViewRules);
const LMLO_Recomb = buildSelector(cemRecombinedCommonRules, LMLOViewRules);

// --- 8 PRIOR selectors: same view/energy rules, but matched against the prior
// study (studyInstanceUIDsIndex === 1). Used by the CEM prior-comparison stage
// so a same-patient prior CEM can hang next to the current one. ---
const buildPriorSelector = (commonRules: unknown[], viewRules: unknown[]) => ({
  seriesMatchingRules: [...commonRules, ...viewRules],
  studyMatchingRules: priorStudyMatchingRules,
});

const RCC_LE_Prior = buildPriorSelector(cemLECommonRules, RCCViewRules);
const LCC_LE_Prior = buildPriorSelector(cemLECommonRules, LCCViewRules);
const RMLO_LE_Prior = buildPriorSelector(cemLECommonRules, RMLOViewRules);
const LMLO_LE_Prior = buildPriorSelector(cemLECommonRules, LMLOViewRules);

const RCC_Recomb_Prior = buildPriorSelector(cemRecombinedCommonRules, RCCViewRules);
const LCC_Recomb_Prior = buildPriorSelector(cemRecombinedCommonRules, LCCViewRules);
const RMLO_Recomb_Prior = buildPriorSelector(cemRecombinedCommonRules, RMLOViewRules);
const LMLO_Recomb_Prior = buildPriorSelector(cemRecombinedCommonRules, LMLOViewRules);

export {
  LCC_LE,
  LCC_LE_Prior,
  LCC_Recomb,
  LCC_Recomb_Prior,
  LMLO_LE,
  LMLO_LE_Prior,
  LMLO_Recomb,
  LMLO_Recomb_Prior,
  RCC_LE,
  RCC_LE_Prior,
  RCC_Recomb,
  RCC_Recomb_Prior,
  RMLO_LE,
  RMLO_LE_Prior,
  RMLO_Recomb,
  RMLO_Recomb_Prior,
};

// Exported for any future stage that wants to build additional prior-comparison
// views for CEM. Kept colocated so the import surface stays narrow.
export { priorStudyMatchingRules };
