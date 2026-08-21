// Breast MRI Hanging Protocol Display Set Selectors
//
// @author Sanjay Balai
//
// Eleven anchored view selectors driving FOUR faculty-specified stages (see
// hpMR.ts):
//
//   Stage 0 "1×2 MIP":   MIP SI | MIP RL
//   Stage 1 "2×3":       T1 | STIR | Sag R  /  Ph2 | Ph5 | Sag L
//   Stage 2 "2×4":       T1 | STIR | COR | Sag R  /  DWI | ADC | Ph2 | Sag L
//   Stage 3 "2×2":       T1 | STIR  /  Ph2 | Ph5
//
// HOW MATCHING WORKS (rebuilt to be tag-based, not SeriesDescription text):
//   Every view is chosen by ONE required rule on the custom `MRViewType`
//   attribute, which classifies a series from its DICOM ACQUISITION TAGS
//   (ImageType / ScanningSequence / InversionTime / DiffusionBValue /
//   TemporalPositionIdentifier / ImageOrientationPatient / ImagePositionPatient)
//   in `utils/mrViewClassifier.ts`. That is the SINGLE SOURCE OF TRUTH — the same
//   classifier drives the dropdown's stage-greying (`utils/mrViewAvailability.ts`),
//   so pane matching, labels, and availability can never diverge.
//
//   Why not SeriesDescription? On GE (our data = SIGNA Explorer, VIBRANT-Flex) the
//   text conflates unrelated series — e.g. VIBRANT "WATER: Ph2/Ax Vibrant-Flex"
//   (ImageType DIXON\WATER) vs SUBTRACTION "SUB 2"/"PHASE 2" (ImageType COMBINED) —
//   so a text matcher put the wrong series in the Vibrant panes. The tag rules are
//   unambiguous. See mrViewClassifier.ts for the exact per-view mapping.
//
//   `required: true` on the MRViewType rule means a viewport takes ONLY a series of
//   its own view and stays EMPTY otherwise (HPMatcher zeroes the score on a failed
//   required rule). `allowUnmatchedView: true` still lets a user manually drag any
//   series onto any viewport (read only by the drop validator, not the matcher).
//
// DUPLICATE SERIES: if a case has two of the same view (a scan repeated after
//   patient motion / breath-hold), the graduated `MRInstanceCount` bonus rules
//   below bias the score toward the series with MORE images (the complete run),
//   because OHIF's native tie-break is lowest SeriesNumber. The bonus only reorders
//   series that already match the same view, so it can never pull in a wrong one.

// Study matching rules
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

// Graduated instance-count bonus — more images ⇒ higher score, so the complete
// acquisition wins over an aborted/repeat run of the SAME view. Spread into every
// selector. Each passing threshold adds its weight (max +5).
const instanceCountBonus = [
  { weight: 1, attribute: 'MRInstanceCount', required: false, constraint: { greaterThan: 20 } },
  { weight: 1, attribute: 'MRInstanceCount', required: false, constraint: { greaterThan: 40 } },
  { weight: 1, attribute: 'MRInstanceCount', required: false, constraint: { greaterThan: 80 } },
  { weight: 1, attribute: 'MRInstanceCount', required: false, constraint: { greaterThan: 120 } },
  { weight: 1, attribute: 'MRInstanceCount', required: false, constraint: { greaterThan: 160 } },
];

// One required rule per view on the tag-based classifier, plus the tie-break bonus.
const viewRules = (viewKey: string) => [
  { weight: 5, attribute: 'MRViewType', required: true, constraint: { equals: viewKey } },
  ...instanceCountBonus,
];

const T1SeriesMatchingRules = viewRules('T1');
const STIRSeriesMatchingRules = viewRules('STIR');
const MIPSISeriesMatchingRules = viewRules('MIP_SI');
const MIPRLSeriesMatchingRules = viewRules('MIP_RL');
const Vibrant2SeriesMatchingRules = viewRules('VIBRANT2');
const Vibrant5SeriesMatchingRules = viewRules('VIBRANT5');
const CoronalSeriesMatchingRules = viewRules('CORONAL');
const SagittalRSeriesMatchingRules = viewRules('SAG_R');
const SagittalLSeriesMatchingRules = viewRules('SAG_L');
const DWISeriesMatchingRules = viewRules('DWI');
const ADCSeriesMatchingRules = viewRules('ADC');

// `allowUnmatchedView: true` — allow manual drag-drop of any series onto any
// viewport (read only by the drop validator, not the auto-matcher).
const T1 = { allowUnmatchedView: true, seriesMatchingRules: T1SeriesMatchingRules, studyMatchingRules: currentStudyMatchingRules };
const STIR = { allowUnmatchedView: true, seriesMatchingRules: STIRSeriesMatchingRules, studyMatchingRules: currentStudyMatchingRules };
const MIPSI = { allowUnmatchedView: true, seriesMatchingRules: MIPSISeriesMatchingRules, studyMatchingRules: currentStudyMatchingRules };
const MIPRL = { allowUnmatchedView: true, seriesMatchingRules: MIPRLSeriesMatchingRules, studyMatchingRules: currentStudyMatchingRules };
const Vibrant2 = { allowUnmatchedView: true, seriesMatchingRules: Vibrant2SeriesMatchingRules, studyMatchingRules: currentStudyMatchingRules };
const Vibrant5 = { allowUnmatchedView: true, seriesMatchingRules: Vibrant5SeriesMatchingRules, studyMatchingRules: currentStudyMatchingRules };
const Coronal = { allowUnmatchedView: true, seriesMatchingRules: CoronalSeriesMatchingRules, studyMatchingRules: currentStudyMatchingRules };
const SagittalR = { allowUnmatchedView: true, seriesMatchingRules: SagittalRSeriesMatchingRules, studyMatchingRules: currentStudyMatchingRules };
const SagittalL = { allowUnmatchedView: true, seriesMatchingRules: SagittalLSeriesMatchingRules, studyMatchingRules: currentStudyMatchingRules };
const DWI = { allowUnmatchedView: true, seriesMatchingRules: DWISeriesMatchingRules, studyMatchingRules: currentStudyMatchingRules };
const ADC = { allowUnmatchedView: true, seriesMatchingRules: ADCSeriesMatchingRules, studyMatchingRules: currentStudyMatchingRules };

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _priorStudyMatchingRules = priorStudyMatchingRules;

export { ADC, Coronal, DWI, MIPRL, MIPSI, SagittalL, SagittalR, STIR, T1, Vibrant2, Vibrant5 };
