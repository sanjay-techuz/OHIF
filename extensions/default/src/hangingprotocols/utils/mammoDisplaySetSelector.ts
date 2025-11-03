// Updated Mammography Hanging Protocol
// Changes:
// - Added support for legacy SNOMED codes (e.g., 'R-10242' for CC, 'R-102D2' for MLO) in ViewCode constraints to handle old DICOM metadata.
// - Made PatientOrientation rules optional (required: false) where they were required, to handle cases where the tag is missing.
// - Added fallback weights for common variations in SeriesDescription and other tags.
// - Retained original rules for new SCT codes to ensure compatibility with modern DICOM.
// - Adjusted some constraints to be more flexible (e.g., contains instead of equals for orientations).

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

const LCCSeriesMatchingRules = [
  {
    weight: 10,
    attribute: 'ViewCode',
    constraint: {
      contains: ['SCT:399162004', 'R-10242'], // Support new SCT and old R- codes for CC
    },
  },
  {
    weight: 5,
    attribute: 'PatientOrientation',
    required: false, // Made optional to handle missing tags
    constraint: {
      contains: 'L',
    },
  },
  {
    weight: 20,
    attribute: 'SeriesDescription',
    constraint: {
      contains: ['LCC', 'CC', 'CSTTemp', 'L CC', 'DummySeriesDesc!'], // Added variations from your cases
    },
  },
  // Fallback for laterality if ImageLaterality is present (common in mammo)
  {
    weight: 25,
    attribute: 'ImageLaterality',
    required: false,
    constraint: {
      equals: 'L',
    },
  },
];

const RCCSeriesMatchingRules = [
  {
    weight: 10,
    attribute: 'ViewCode',
    constraint: {
      contains: ['SCT:399162004', 'R-10242'], // Support new and old for CC
    },
  },
  {
    weight: 5,
    attribute: 'PatientOrientation',
    required: false, // Made optional
    constraint: {
      contains: ['P', 'L'],
    },
  },
  {
    attribute: 'PatientOrientation',
    required: false, // Changed from true to false
    constraint: {
      doesNotContain: ['A', 'R'],
    },
  },
  {
    weight: 20,
    attribute: 'SeriesDescription',
    constraint: {
      contains: ['RCC', 'CC', 'CSTTemp', 'R CC', 'DummySeriesDesc!'], // Added variations
    },
  },
  {
    weight: 25,
    attribute: 'ImageLaterality',
    required: false,
    constraint: {
      equals: 'R',
    },
  },
];

const LMLOSeriesMatchingRules = [
  {
    weight: 10,
    attribute: 'ViewCode',
    constraint: {
      contains: ['SCT:399368009', 'R-102D2'], // Support new and old for MLO
    },
  },
  {
    weight: 0,
    attribute: 'ViewCode',
    required: false, // Made optional
    constraint: {
      doesNotContain: ['SCT:399162004', 'R-10242', 'DummyViewCode!'], // Updated for both code types
    },
  },
  {
    weight: 5,
    attribute: 'PatientOrientation',
    required: false,
    constraint: {
      contains: ['A', 'R'],
    },
  },
  {
    weight: 20,
    attribute: 'SeriesDescription',
    constraint: {
      contains: ['LMLO', 'MLO', 'XRF02', 'L MLO', 'DummySeriesDesc!'], // Added variations from your cases
    },
  },
  {
    weight: 25,
    attribute: 'ImageLaterality',
    required: false,
    constraint: {
      equals: 'L',
    },
  },
];

const RMLOSeriesMatchingRules = [
  {
    weight: 10,
    attribute: 'ViewCode',
    constraint: {
      contains: ['SCT:399368009', 'R-102D2'], // Support new and old for MLO
    },
  },
  {
    attribute: 'ViewCode',
    required: false, // Made optional
    constraint: {
      doesNotContain: ['SCT:399162004', 'R-10242'], // Updated for both
    },
  },
  {
    attribute: 'PatientOrientation',
    required: false,
    constraint: {
      doesNotContain: ['P', 'FL'],
    },
  },
  {
    weight: 5,
    attribute: 'PatientOrientation',
    required: false,
    constraint: {
      contains: ['P', 'L'],
    },
  },
  {
    weight: 5,
    attribute: 'PatientOrientation',
    required: false,
    constraint: {
      equals: ['A', 'FR'],
    },
  },
  {
    weight: 20,
    attribute: 'SeriesDescription',
    constraint: {
      contains: ['RMLO', 'MLO', 'RXCCL', 'XRF02', 'R MLO'], // Added variations
    },
  },
  {
    attribute: 'SeriesDescription',
    required: false,
    constraint: {
      doesNotContain: 'CC',
    },
  },
  {
    attribute: 'SeriesDescription',
    required: false,
    constraint: {
      doesNotContain: ['LMLO', 'L MLO'],
    },
  },
  {
    weight: 25,
    attribute: 'ImageLaterality',
    required: false,
    constraint: {
      equals: 'R',
    },
  },
];

const RCC = {
  seriesMatchingRules: RCCSeriesMatchingRules,
  studyMatchingRules: currentStudyMatchingRules,
};

const RCCPrior = {
  seriesMatchingRules: RCCSeriesMatchingRules,
  studyMatchingRules: priorStudyMatchingRules,
};

const LCC = {
  seriesMatchingRules: LCCSeriesMatchingRules,
  studyMatchingRules: currentStudyMatchingRules,
};

const LCCPrior = {
  seriesMatchingRules: LCCSeriesMatchingRules,
  studyMatchingRules: priorStudyMatchingRules,
};

const RMLO = {
  seriesMatchingRules: RMLOSeriesMatchingRules,
  studyMatchingRules: currentStudyMatchingRules,
};

const RMLOPrior = {
  seriesMatchingRules: RMLOSeriesMatchingRules,
  studyMatchingRules: priorStudyMatchingRules,
};

const LMLO = {
  seriesMatchingRules: LMLOSeriesMatchingRules,
  studyMatchingRules: currentStudyMatchingRules,
};

const LMLOPrior = {
  seriesMatchingRules: LMLOSeriesMatchingRules,
  studyMatchingRules: priorStudyMatchingRules,
};

// DBT (Digital Breast Tomosynthesis) Series Matching Rules
const RCC3DSeriesMatchingRules = [
  {
    weight: 30,
    attribute: 'SOPClassUID',
    constraint: {
      equals: '1.2.840.10008.5.1.4.1.1.13.1.3', // DBT SOP Class UID
    },
  },
  {
    weight: 10,
    attribute: 'SeriesDescription',
    constraint: {
      contains: ['R CC', 'RCC3D', 'RCC 3D', 'RCC-3D', 'RCC_DBT', 'RCC DBT', 'RCC_TOMO', 'RCC TOMO'],
    },
  },
  {
    weight: 25,
    attribute: 'ImageLaterality',
    required: false,
    constraint: {
      equals: 'R',
    },
  },
  {
    weight: 15,
    attribute: 'Modality',
    constraint: {
      equals: 'MG',
    },
  },
  {
    weight: 15,
    attribute: 'PatientOrientation',
    required: false,
    constraint: {
      contains: ['P', 'L'],
    },
  },
];

const LCC3DSeriesMatchingRules = [
  {
    weight: 30,
    attribute: 'SOPClassUID',
    constraint: {
      equals: '1.2.840.10008.5.1.4.1.1.13.1.3', // DBT SOP Class UID
    },
  },
  {
    weight: 10,
    attribute: 'SeriesDescription',
    constraint: {
      contains: ['L CC', 'LCC3D', 'LCC 3D', 'LCC-3D', 'LCC_DBT', 'LCC DBT', 'LCC_TOMO', 'LCC TOMO'],
    },
  },
  {
    weight: 25,
    attribute: 'ImageLaterality',
    required: false,
    constraint: {
      equals: 'L',
    },
  },
  {
    weight: 15,
    attribute: 'Modality',
    constraint: {
      equals: 'MG',
    },
  },
  {
    weight: 15,
    attribute: 'PatientOrientation',
    required: false,
    constraint: {
      contains: ['A', 'R'],
    },
  },
];

const RMLO3DSeriesMatchingRules = [
  {
    weight: 30,
    attribute: 'SOPClassUID',
    constraint: {
      equals: '1.2.840.10008.5.1.4.1.1.13.1.3', // DBT SOP Class UID
    },
  },
  {
    weight: 10,
    attribute: 'SeriesDescription',
    constraint: {
      contains: [
        'R MLO',
        'RMLO3D',
        'RMLO 3D',
        'RMLO-3D',
        'RMLO_DBT',
        'RMLO DBT',
        'RMLO_TOMO',
        'RMLO TOMO',
      ],
    },
  },
  {
    weight: 25,
    attribute: 'ImageLaterality',
    required: false,
    constraint: {
      equals: 'R',
    },
  },
  {
    weight: 15,
    attribute: 'Modality',
    constraint: {
      equals: 'MG',
    },
  },
  {
    weight: 15,
    attribute: 'PatientOrientation',
    required: false,
    constraint: {
      contains: ['P', 'FL'],
    },
  },
];

const LMLO3DSeriesMatchingRules = [
  {
    weight: 30,
    attribute: 'SOPClassUID',
    constraint: {
      equals: '1.2.840.10008.5.1.4.1.1.13.1.3', // DBT SOP Class UID
    },
  },
  {
    weight: 10,
    attribute: 'SeriesDescription',
    constraint: {
      contains: [
        'L MLO',
        'LMLO3D',
        'LMLO 3D',
        'LMLO-3D',
        'LMLO_DBT',
        'LMLO DBT',
        'LMLO_TOMO',
        'LMLO TOMO',
      ],
    },
  },
  {
    weight: 25,
    attribute: 'ImageLaterality',
    required: false,
    constraint: {
      equals: 'L',
    },
  },
  {
    weight: 15,
    attribute: 'Modality',
    constraint: {
      equals: 'MG',
    },
  },
  {
    weight: 15,
    attribute: 'PatientOrientation',
    required: false,
    constraint: {
      contains: ['A', 'FR'],
    },
  },
];

// DBT Display Set Objects
const RCC3D = {
  seriesMatchingRules: RCC3DSeriesMatchingRules,
  studyMatchingRules: currentStudyMatchingRules,
};

const RCC3DPrior = {
  seriesMatchingRules: RCC3DSeriesMatchingRules,
  studyMatchingRules: priorStudyMatchingRules,
};

const LCC3D = {
  seriesMatchingRules: LCC3DSeriesMatchingRules,
  studyMatchingRules: currentStudyMatchingRules,
};

const LCC3DPrior = {
  seriesMatchingRules: LCC3DSeriesMatchingRules,
  studyMatchingRules: priorStudyMatchingRules,
};

const RMLO3D = {
  seriesMatchingRules: RMLO3DSeriesMatchingRules,
  studyMatchingRules: currentStudyMatchingRules,
};

const RMLO3DPrior = {
  seriesMatchingRules: RMLO3DSeriesMatchingRules,
  studyMatchingRules: priorStudyMatchingRules,
};

const LMLO3D = {
  seriesMatchingRules: LMLO3DSeriesMatchingRules,
  studyMatchingRules: currentStudyMatchingRules,
};

const LMLO3DPrior = {
  seriesMatchingRules: LMLO3DSeriesMatchingRules,
  studyMatchingRules: priorStudyMatchingRules,
};

export {
  LCC,
  LCC3D,
  LCC3DPrior,
  LCCPrior,
  LMLO,
  LMLO3D,
  LMLO3DPrior,
  LMLOPrior,
  RCC,
  RCC3D,
  RCC3DPrior,
  RCCPrior,
  RMLO,
  RMLO3D,
  RMLO3DPrior,
  RMLOPrior,
};
