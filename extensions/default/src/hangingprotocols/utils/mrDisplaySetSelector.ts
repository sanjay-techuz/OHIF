// Breast MRI Hanging Protocol Selectors
// This defines series matching rules for common breast MRI sequences based on standard protocols (e.g., ACR BI-RADS, RSNA guidelines).
// Key sequences targeted: T2-weighted (for anatomy/cysts), T1 pre-contrast (baseline), Dynamic Contrast-Enhanced (DCE) post-contrast phases,
// Subtractions, Diffusion-Weighted Imaging (DWI), and MIPs.
// Rules use Modality 'MR', BodyPartExamined 'BREAST', and flexible SeriesDescription patterns to handle vendor variations (e.g., Siemens, GE, Philips).
// PatientOrientation is optional and targets common axial 'H\F' (head-feet).
// Differentiation for current/prior uses studyInstanceUIDsIndex (0 for current, 1 for prior).
// Assumes bilateral imaging; if unilateral, ImageLaterality ('L'/'R') can refine but is not required.
// Fallbacks include common abbreviations (e.g., 'T2 FS', 'T1 PRE', 'DCE POST1').

// Study matching rules (same as mammography)
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

// Common constraints for all breast MRI series
const breastMRCommonRules = [
  {
    weight: 20,
    attribute: 'Modality',
    constraint: {
      equals: 'MR',
    },
  },
  {
    weight: 15,
    attribute: 'BodyPartExamined',
    required: false, // Often 'BREAST' or 'CHEST' including breasts
    constraint: {
      contains: ['BREAST', 'BILATERAL BREAST'],
    },
  },
  {
    weight: 5,
    attribute: 'PatientOrientation',
    required: false, // Optional; common for axial slices
    constraint: {
      contains: ['H', 'F'], // Head-feet orientation
    },
  },
];

// T2-Weighted Axial (Fat-Sat) Series Matching Rules
// Common descriptions: 'AX T2 FS', 'T2 FAT SAT', 'T2WI AXIAL', 'sagT2', etc.
const T2AxialSeriesMatchingRules = [
  ...breastMRCommonRules,
  {
    weight: 25,
    attribute: 'SeriesDescription',
    constraint: {
      contains: ['T2', 'T2 FS', 'T2 FAT SAT', 'T2WI', 'T2 AX', 'AX T2', 'Sag T2', 'T2 SAG'], // Axial/sagittal T2 variations
    },
  },
  {
    weight: 10,
    attribute: 'SequenceName', // DICOM (0018,1080) for more precision if available
    required: false,
    constraint: {
      contains: ['T2', 'TSE', 'HASTE'], // Common sequence types
    },
  },
];

// T1-Weighted Pre-Contrast Axial (Fat-Sat) Series Matching Rules
// Common: 'AX T1 PRE FS', 'T1 FAT SAT PRE', 't1_fs_pre', etc.
const T1PreAxialSeriesMatchingRules = [
  ...breastMRCommonRules,
  {
    weight: 25,
    attribute: 'SeriesDescription',
    constraint: {
      contains: [
        'T1 PRE',
        'T1 FS PRE',
        'T1 FAT SAT PRE',
        'PRE CONTRAST',
        't1_pre',
        'T1 BASELINE',
        'AX T1 PRE',
      ],
    },
  },
  {
    weight: 10,
    attribute: 'SequenceName',
    required: false,
    constraint: {
      contains: ['T1', 'GRE', 'VIBE'], // Gradient echo sequences
    },
  },
];

// DCE Post-Contrast Phase 1 (Early/Arterial) Axial Series
// Common: 'AX T1 POST1 FS', 'DCE POST1', 't1_fs_post1', etc.
const DCEPost1AxialSeriesMatchingRules = [
  ...breastMRCommonRules,
  {
    weight: 25,
    attribute: 'SeriesDescription',
    constraint: {
      contains: [
        'T1 POST1',
        'T1 FS POST1',
        'DCE POST1',
        'POST CONTRAST 1',
        't1_post1',
        'EARLY POST',
        'AX T1 POST1',
      ],
    },
  },
  {
    weight: 10,
    attribute: 'SequenceName',
    required: false,
    constraint: {
      contains: ['T1', 'DCE', 'VIBE'],
    },
  },
];

// DCE Post-Contrast Phase 2 (Venous/Delayed) Axial Series
// Common: 'AX T1 POST2 FS', 'DCE POST2', etc. (Fallback to POST if only one post phase)
const DCEPost2AxialSeriesMatchingRules = [
  ...breastMRCommonRules,
  {
    weight: 25,
    attribute: 'SeriesDescription',
    constraint: {
      contains: [
        'T1 POST2',
        'T1 FS POST2',
        'DCE POST2',
        'POST CONTRAST 2',
        't1_post2',
        'DELAYED POST',
        'AX T1 POST2',
        'POST',
      ],
    },
  },
  {
    weight: 10,
    attribute: 'SequenceName',
    required: false,
    constraint: {
      contains: ['T1', 'DCE'],
    },
  },
];

// Subtraction Post-Contrast Phase 1 Axial
// Common: 'SUB AX T1 POST1', 'SUBTRACTION POST1', 't1_sub_post1'
const SubPost1AxialSeriesMatchingRules = [
  ...breastMRCommonRules,
  {
    weight: 30,
    attribute: 'SeriesDescription',
    constraint: {
      contains: ['SUB', 'SUBTRACTION', 'SUB POST1', 'T1 SUB POST1', 't1_sub_post1', 'AX SUB POST1'],
    },
  },
];

// Diffusion-Weighted Imaging (DWI) Axial
// Common: 'DWI AX', 'DIFF AX', 'b1000', 'ADC MAP'
const DWIAxialSeriesMatchingRules = [
  ...breastMRCommonRules,
  {
    weight: 25,
    attribute: 'SeriesDescription',
    constraint: {
      contains: ['DWI', 'DIFF', 'DIFFUSION', 'b1000', 'b50', 'ADC', 'DWI AX', 'DIFF AX'],
    },
  },
  {
    weight: 10,
    attribute: 'SequenceName',
    required: false,
    constraint: {
      contains: ['EPI', 'DWI'],
    },
  },
];

// MIP (Maximum Intensity Projection) Series
// Common: 'MIP AX', 'MIP SAG', 'COR MIP', often post-contrast
const MIPAxialSeriesMatchingRules = [
  ...breastMRCommonRules,
  {
    weight: 30,
    attribute: 'SeriesDescription',
    constraint: {
      contains: ['MIP', 'MAX INTENSITY', 'MIP AX', 'MIP SAG', 'MIP COR', 'POST MIP'],
    },
  },
  {
    weight: 15,
    attribute: 'ImageType', // (0008,0008) may indicate derived/MIP
    required: false,
    constraint: {
      contains: ['DERIVED', 'SECONDARY'],
    },
  },
];

// Non-Fat-Sat T1 Axial (Optional, for fat-containing lesions)
// Common: 'T1 NFS', 'T1 NON FAT SAT'
const T1NonFatSatAxialSeriesMatchingRules = [
  ...breastMRCommonRules,
  {
    weight: 25,
    attribute: 'SeriesDescription',
    constraint: {
      contains: ['T1 NFS', 'T1 NON FAT SAT', 'T1 NO FAT SUPP', 't1_nfs', 'AX T1 NFS'],
    },
  },
];

// Display Set Objects for Current Study
const T2Axial = {
  seriesMatchingRules: T2AxialSeriesMatchingRules,
  studyMatchingRules: currentStudyMatchingRules,
};

const T1PreAxial = {
  seriesMatchingRules: T1PreAxialSeriesMatchingRules,
  studyMatchingRules: currentStudyMatchingRules,
};

const DCEPost1Axial = {
  seriesMatchingRules: DCEPost1AxialSeriesMatchingRules,
  studyMatchingRules: currentStudyMatchingRules,
};

const DCEPost2Axial = {
  seriesMatchingRules: DCEPost2AxialSeriesMatchingRules,
  studyMatchingRules: currentStudyMatchingRules,
};

const SubPost1Axial = {
  seriesMatchingRules: SubPost1AxialSeriesMatchingRules,
  studyMatchingRules: currentStudyMatchingRules,
};

const DWIAxial = {
  seriesMatchingRules: DWIAxialSeriesMatchingRules,
  studyMatchingRules: currentStudyMatchingRules,
};

const MIPAxial = {
  seriesMatchingRules: MIPAxialSeriesMatchingRules,
  studyMatchingRules: currentStudyMatchingRules,
};

const T1NonFatSatAxial = {
  seriesMatchingRules: T1NonFatSatAxialSeriesMatchingRules,
  studyMatchingRules: currentStudyMatchingRules,
};

// Display Set Objects for Prior Study
const T2AxialPrior = {
  seriesMatchingRules: T2AxialSeriesMatchingRules,
  studyMatchingRules: priorStudyMatchingRules,
};

const T1PreAxialPrior = {
  seriesMatchingRules: T1PreAxialSeriesMatchingRules,
  studyMatchingRules: priorStudyMatchingRules,
};

const DCEPost1AxialPrior = {
  seriesMatchingRules: DCEPost1AxialSeriesMatchingRules,
  studyMatchingRules: priorStudyMatchingRules,
};

const DCEPost2AxialPrior = {
  seriesMatchingRules: DCEPost2AxialSeriesMatchingRules,
  studyMatchingRules: priorStudyMatchingRules,
};

const SubPost1AxialPrior = {
  seriesMatchingRules: SubPost1AxialSeriesMatchingRules,
  studyMatchingRules: priorStudyMatchingRules,
};

const DWIAxialPrior = {
  seriesMatchingRules: DWIAxialSeriesMatchingRules,
  studyMatchingRules: priorStudyMatchingRules,
};

const MIPAxialPrior = {
  seriesMatchingRules: MIPAxialSeriesMatchingRules,
  studyMatchingRules: priorStudyMatchingRules,
};

const T1NonFatSatAxialPrior = {
  seriesMatchingRules: T1NonFatSatAxialSeriesMatchingRules,
  studyMatchingRules: priorStudyMatchingRules,
};

export {
  DCEPost1Axial,
  DCEPost1AxialPrior,
  DCEPost2Axial,
  DCEPost2AxialPrior,
  DWIAxial,
  DWIAxialPrior,
  MIPAxial,
  MIPAxialPrior,
  SubPost1Axial,
  SubPost1AxialPrior,
  T1NonFatSatAxial,
  T1NonFatSatAxialPrior,
  T1PreAxial,
  T1PreAxialPrior,
  // Current
  T2Axial,
  // Prior
  T2AxialPrior,
};
