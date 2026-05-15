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

const priorStudyMatchingRules = [
  {
    weight: 1,
    attribute: 'StudyInstanceUID',
    from: 'prior',
    required: true,
    constraint: { notNull: true },
  },
];

const currentStudyMatchingRules: unknown[] = [];

// --- Modality + ImageType filters shared by every CEM selector. ---
//
// Modality is reported as 'MG' for CEM (DICOM doesn't have a separate CEM
// modality code). The CEM-specific signal is ImageType[3]. We split into
// two arrays so the laterality+view rules below can append either LE or
// RECOMBINED.
const cemLECommonRules = [
  { weight: 30, attribute: 'Modality', constraint: { equals: 'MG' } },
  { weight: 25, attribute: 'ImageType', constraint: { contains: 'LOW_ENERGY' } },
];

const cemRecombinedCommonRules = [
  { weight: 30, attribute: 'Modality', constraint: { equals: 'MG' } },
  { weight: 25, attribute: 'ImageType', constraint: { contains: 'RECOMBINED' } },
];

// --- Laterality + view fragments. Reused for both LE and Recombined. ---

const RCCViewRules = [
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
];

const LCCViewRules = [
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
];

const RMLOViewRules = [
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
];

const LMLOViewRules = [
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

export { LCC_LE, LCC_Recomb, LMLO_LE, LMLO_Recomb, RCC_LE, RCC_Recomb, RMLO_LE, RMLO_Recomb };

// `priorStudyMatchingRules` is exported in case a future stage wants
// prior-comparison views for CEM (mirroring hpMammo). Kept colocated so
// the import surface stays narrow.
    export { priorStudyMatchingRules };
