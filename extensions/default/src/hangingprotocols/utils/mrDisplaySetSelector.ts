// Breast MRI Hanging Protocol Display Set Selectors
// Defines series matching rules for common breast MRI sequences
// Based on standard protocols (e.g., ACR BI-RADS, RSNA guidelines)

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
    required: false,
    constraint: {
      contains: ['BREAST', 'BILATERAL BREAST', 'CHEST', 'MAMMA'],
    },
  },
];

// T1-Weighted Series Matching Rules
const T1SeriesMatchingRules = [
  ...breastMRCommonRules,
  {
    weight: 40,
    attribute: 'EchoTime',
    constraint: { lessThan: 20 }, // T1 has short TE
  },
  {
    weight: 25,
    attribute: 'SeriesDescription',
    constraint: {
      contains: [
        'T1',
        'PRE',
        'BASELINE',
        'NON-FS',
        'T1W',
        'T1 WEIGHTED',
        'T1WI',
        'T1 PRE',
        'T1 FS',
        'T1 FAT SAT',
        'AX T1',
        'T1 AX',
        'Ax T1 FSE',
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
      contains: ['T1', 'GRE', 'VIBE', 'TSE'],
    },
  },
  {
    weight: 5,
    attribute: 'PatientOrientation',
    required: false,
    constraint: {
      contains: ['H', 'F'], // Head-feet orientation for axial
    },
  },
];

// T2-Weighted Series Matching Rules
const T2SeriesMatchingRules = [
  ...breastMRCommonRules,
  {
    weight: 40,
    attribute: 'EchoTime',
    constraint: { greaterThan: 60 }, // T2 has long TE
  },
  {
    weight: 25,
    attribute: 'SeriesDescription',
    constraint: {
      contains: [
        'T2',
        'STIR',
        'SPAIR',
        'FAT SAT',
        'T2W',
        'T2 WEIGHTED',
        'T2WI',
        'T2 FS',
        'T2 FAT SAT',
        'AX T2',
        'T2 AX',
        'T2 SAG',
        'SAG T2',
      ],
    },
  },
  {
    weight: 10,
    attribute: 'SequenceName',
    required: false,
    constraint: {
      contains: ['T2', 'TSE', 'HASTE', 'FSE'],
    },
  },
  {
    weight: 5,
    attribute: 'PatientOrientation',
    required: false,
    constraint: {
      contains: ['H', 'F'], // Head-feet orientation for axial
    },
  },
];

// Sagittal Series Matching Rules
const SagittalSeriesMatchingRules = [
  ...breastMRCommonRules,
  {
    weight: 40,
    attribute: 'SeriesDescription',
    constraint: {
      contains: [
        'SAG',
        'SAGITTAL',
        'SAG T1',
        'SAG T2',
        'T1 SAG',
        'T2 SAG',
        'SAGITTAL T1',
        'SAGITTAL T2',
      ],
    },
  },
  {
    weight: 10,
    attribute: 'PatientOrientation',
    required: false,
    constraint: {
      contains: ['S', 'I'], // Superior-inferior orientation for sagittal
    },
  },
  {
    weight: 10,
    attribute: 'ImageOrientationPatient',
    constraint: {
      // Sagittal Vector Check
      range: { value: [0, 1, 0, 0, 0, -1], tolerance: 0.2 },
    },
  },
];

// Post-Contrast Series Matching Rules
const PostContrastSeriesMatchingRules = [
  ...breastMRCommonRules,
  {
    weight: 40,
    attribute: 'SeriesDescription',
    constraint: {
      contains: [
        'SUB',
        'DYNAMIC',
        'GD',
        'DELAYED',
        '1ST PASS',
        'POST',
        'POST CONTRAST',
        'POST-CONTRAST',
        'POST1',
        'POST2',
        'DCE POST',
        'T1 POST',
        'T1 FS POST',
        'POST CONTRAST 1',
        'POST CONTRAST 2',
        'AX POST',
        'POST AX',
      ],
    },
  },
  {
    weight: 10,
    attribute: 'SequenceName',
    required: false,
    constraint: {
      contains: ['T1', 'DCE', 'VIBE', 'POST'],
    },
  },
  {
    weight: 10,
    attribute: 'ImageType',
    constraint: {
      contains: ['SUBTRACTION'],
    },
  },
  {
    weight: 5,
    attribute: 'PatientOrientation',
    required: false,
    constraint: {
      contains: ['H', 'F'], // Head-feet orientation for axial
    },
  },
];

// MIP (Maximum Intensity Projection) Series Matching Rules
const MIPSeriesMatchingRules = [
  ...breastMRCommonRules,
  {
    weight: 40,
    attribute: 'SeriesDescription',
    constraint: {
      contains: [
        'MIP',
        'MAX INTENSITY',
        'MAXIMUM INTENSITY',
        'MIP AX',
        'MIP SAG',
        'MIP COR',
        'POST MIP',
        'MIP POST',
        'MIP AXIAL',
        'MIP SAGITTAL',
        'MIP CORONAL',
        'MIP RL',
        'MIP SI',
        'MIP AP',
        '3D MIP',
      ],
    },
  },
  {
    weight: 30,
    attribute: 'ImageType',
    constraint: {
      contains: ['MIP', 'DERIVED', 'SECONDARY'],
    },
  },
];

// Coronal Series Matching Rules
const CoronalSeriesMatchingRules = [
  ...breastMRCommonRules,
  {
    weight: 40,
    attribute: 'SeriesDescription',
    constraint: {
      contains: [
        'COR',
        'CORONAL',
        'COR T1',
        'COR T2',
        'T1 COR',
        'T2 COR',
        'CORONAL T1',
        'CORONAL T2',
      ],
    },
  },
  {
    weight: 20,
    attribute: 'ImageOrientationPatient',
    constraint: {
      // Coronal Vector Check
      range: { value: [1, 0, 0, 0, 0, -1], tolerance: 0.2 },
    },
  },
  {
    weight: 10,
    attribute: 'PatientOrientation',
    required: false,
    constraint: {
      contains: ['A', 'P'], // Anterior-posterior orientation for coronal
    },
  },
  {
    weight: 10,
    attribute: 'ImageOrientationPatient',
    required: false,
    constraint: {
      contains: ['COR'],
    },
  },
];

// Display Set Objects for Current Study
const T1 = {
  seriesMatchingRules: T1SeriesMatchingRules,
  studyMatchingRules: currentStudyMatchingRules,
};

const T2 = {
  seriesMatchingRules: T2SeriesMatchingRules,
  studyMatchingRules: currentStudyMatchingRules,
};

const Sagittal = {
  seriesMatchingRules: SagittalSeriesMatchingRules,
  studyMatchingRules: currentStudyMatchingRules,
};

const PostContrast = {
  seriesMatchingRules: PostContrastSeriesMatchingRules,
  studyMatchingRules: currentStudyMatchingRules,
};

const MIP = {
  seriesMatchingRules: MIPSeriesMatchingRules,
  studyMatchingRules: currentStudyMatchingRules,
};

const Coronal = {
  seriesMatchingRules: CoronalSeriesMatchingRules,
  studyMatchingRules: currentStudyMatchingRules,
};

export { Coronal, MIP, PostContrast, Sagittal, T1, T2 };
