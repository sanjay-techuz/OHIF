import {
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
  T2Axial,
  T2AxialPrior,
} from './utils/mrDisplaySetSelector';

// Default display area for MR
const defaultDisplayArea = {
  storeAsInitialCamera: true,
};

const hpMR = {
  id: '@ohif/hpMR',
  hasUpdatedPriorsInformation: false,
  name: 'Breast MRI Hanging Protocol',
  protocolMatchingRules: [
    {
      id: 'MRI',
      weight: 10,
      attribute: 'ModalitiesInStudy',
      constraint: {
        contains: 'MR',
      },
      required: true,
    },
    {
      id: 'numberOfImages',
      attribute: 'numberOfDisplaySetsWithImages',
      constraint: {
        greaterThan: 0,
      },
      required: true,
    },
    {
      id: 'BodyPartExamined',
      weight: 5,
      attribute: 'BodyPartExamined',
      required: false,
      constraint: {
        contains: ['BREAST', 'BILATERAL BREAST'],
      },
    },
  ],
  toolGroupIds: ['default'],
  displaySetSelectors: {
    T2Axial,
    T2AxialPrior,
    T1PreAxial,
    T1PreAxialPrior,
    DCEPost1Axial,
    DCEPost1AxialPrior,
    DCEPost2Axial,
    DCEPost2AxialPrior,
    SubPost1Axial,
    SubPost1AxialPrior,
    DWIAxial,
    DWIAxialPrior,
    MIPAxial,
    MIPAxialPrior,
    T1NonFatSatAxial,
    T1NonFatSatAxialPrior,
  },
  stages: [
    // Stage 0: All Prior and Current (2x4 grid)
    {
      name: 'All Prior and Current',
      viewportStructure: {
        type: 'grid',
        layoutType: 'grid',
        properties: {
          rows: 2,
          columns: 4,
        },
      },
      viewports: [
        {
          viewportOptions: {
            toolGroupId: 'default',
            displayArea: defaultDisplayArea,
          },
          displaySets: [{ id: 'T2Axial' }],
        },
        {
          viewportOptions: {
            toolGroupId: 'default',
            displayArea: defaultDisplayArea,
          },
          displaySets: [{ id: 'T1PreAxial' }],
        },
        {
          viewportOptions: {
            toolGroupId: 'default',
            displayArea: defaultDisplayArea,
          },
          displaySets: [{ id: 'DCEPost1Axial' }],
        },
        {
          viewportOptions: {
            toolGroupId: 'default',
            displayArea: defaultDisplayArea,
          },
          displaySets: [{ id: 'DCEPost2Axial' }],
        },
        {
          viewportOptions: {
            toolGroupId: 'default',
            displayArea: defaultDisplayArea,
          },
          displaySets: [{ id: 'T2AxialPrior' }],
        },
        {
          viewportOptions: {
            toolGroupId: 'default',
            displayArea: defaultDisplayArea,
          },
          displaySets: [{ id: 'T1PreAxialPrior' }],
        },
        {
          viewportOptions: {
            toolGroupId: 'default',
            displayArea: defaultDisplayArea,
          },
          displaySets: [{ id: 'DCEPost1AxialPrior' }],
        },
        {
          viewportOptions: {
            toolGroupId: 'default',
            displayArea: defaultDisplayArea,
          },
          displaySets: [{ id: 'DCEPost2AxialPrior' }],
        },
      ],
    },
    // Stage 1: T2 Compare (Current/Prior) - 1x2 grid
    {
      name: 'T2 Compare',
      viewportStructure: {
        type: 'grid',
        layoutType: 'grid',
        properties: {
          rows: 1,
          columns: 2,
        },
      },
      viewports: [
        {
          viewportOptions: {
            toolGroupId: 'default',
            displayArea: defaultDisplayArea,
          },
          displaySets: [{ id: 'T2Axial' }],
        },
        {
          viewportOptions: {
            toolGroupId: 'default',
            displayArea: defaultDisplayArea,
          },
          displaySets: [{ id: 'T2AxialPrior' }],
        },
      ],
    },
    // Stage 2: All Current (2x4 grid)
    {
      name: 'All Current',
      viewportStructure: {
        type: 'grid',
        layoutType: 'grid',
        properties: {
          rows: 2,
          columns: 4,
        },
      },
      viewports: [
        {
          viewportOptions: {
            toolGroupId: 'default',
            displayArea: defaultDisplayArea,
          },
          displaySets: [{ id: 'T2Axial' }],
        },
        {
          viewportOptions: {
            toolGroupId: 'default',
            displayArea: defaultDisplayArea,
          },
          displaySets: [{ id: 'T1PreAxial' }],
        },
        {
          viewportOptions: {
            toolGroupId: 'default',
            displayArea: defaultDisplayArea,
          },
          displaySets: [{ id: 'DCEPost1Axial' }],
        },
        {
          viewportOptions: {
            toolGroupId: 'default',
            displayArea: defaultDisplayArea,
          },
          displaySets: [{ id: 'DCEPost2Axial' }],
        },
        {
          viewportOptions: {
            toolGroupId: 'default',
            displayArea: defaultDisplayArea,
          },
          displaySets: [{ id: 'SubPost1Axial' }],
        },
        {
          viewportOptions: {
            toolGroupId: 'default',
            displayArea: defaultDisplayArea,
          },
          displaySets: [{ id: 'DWIAxial' }],
        },
        {
          viewportOptions: {
            toolGroupId: 'default',
            displayArea: defaultDisplayArea,
          },
          displaySets: [{ id: 'MIPAxial' }],
        },
        {
          viewportOptions: {
            toolGroupId: 'default',
            displayArea: defaultDisplayArea,
          },
          displaySets: [{ id: 'T1NonFatSatAxial' }],
        },
      ],
    },
    // Stage 3: T2 Axial
    {
      name: 'T2 Axial',
      viewportStructure: {
        type: 'grid',
        layoutType: 'grid',
        properties: {
          rows: 1,
          columns: 1,
        },
      },
      viewports: [
        {
          viewportOptions: {
            toolGroupId: 'default',
            displayArea: defaultDisplayArea,
          },
          displaySets: [{ id: 'T2Axial' }],
        },
      ],
    },
    // Stage 4: T1 Pre Current/Prior - 1x2 grid
    {
      name: 'T1 Pre Current/Prior',
      viewportStructure: {
        type: 'grid',
        layoutType: 'grid',
        properties: {
          rows: 1,
          columns: 2,
        },
      },
      viewports: [
        {
          viewportOptions: {
            toolGroupId: 'default',
            displayArea: defaultDisplayArea,
          },
          displaySets: [{ id: 'T1PreAxial' }],
        },
        {
          viewportOptions: {
            toolGroupId: 'default',
            displayArea: defaultDisplayArea,
          },
          displaySets: [{ id: 'T1PreAxialPrior' }],
        },
      ],
    },
    // Stage 5: T1 Pre Axial
    {
      name: 'T1 Pre Axial',
      viewportStructure: {
        type: 'grid',
        layoutType: 'grid',
        properties: {
          rows: 1,
          columns: 1,
        },
      },
      viewports: [
        {
          viewportOptions: {
            toolGroupId: 'default',
            displayArea: defaultDisplayArea,
          },
          displaySets: [{ id: 'T1PreAxial' }],
        },
      ],
    },
    // Stage 6: DCE Post1 Current/Prior - 1x2 grid
    {
      name: 'DCE Post1 Current/Prior',
      viewportStructure: {
        type: 'grid',
        layoutType: 'grid',
        properties: {
          rows: 1,
          columns: 2,
        },
      },
      viewports: [
        {
          viewportOptions: {
            toolGroupId: 'default',
            displayArea: defaultDisplayArea,
          },
          displaySets: [{ id: 'DCEPost1Axial' }],
        },
        {
          viewportOptions: {
            toolGroupId: 'default',
            displayArea: defaultDisplayArea,
          },
          displaySets: [{ id: 'DCEPost1AxialPrior' }],
        },
      ],
    },
    // Stage 7: DCE Post1 Axial
    {
      name: 'DCE Post1 Axial',
      viewportStructure: {
        type: 'grid',
        layoutType: 'grid',
        properties: {
          rows: 1,
          columns: 1,
        },
      },
      viewports: [
        {
          viewportOptions: {
            toolGroupId: 'default',
            displayArea: defaultDisplayArea,
          },
          displaySets: [{ id: 'DCEPost1Axial' }],
        },
      ],
    },
    // Stage 8: DCE Post2 Current/Prior - 1x2 grid
    {
      name: 'DCE Post2 Current/Prior',
      viewportStructure: {
        type: 'grid',
        layoutType: 'grid',
        properties: {
          rows: 1,
          columns: 2,
        },
      },
      viewports: [
        {
          viewportOptions: {
            toolGroupId: 'default',
            displayArea: defaultDisplayArea,
          },
          displaySets: [{ id: 'DCEPost2Axial' }],
        },
        {
          viewportOptions: {
            toolGroupId: 'default',
            displayArea: defaultDisplayArea,
          },
          displaySets: [{ id: 'DCEPost2AxialPrior' }],
        },
      ],
    },
    // Stage 9: DCE Post2 Axial
    {
      name: 'DCE Post2 Axial',
      viewportStructure: {
        type: 'grid',
        layoutType: 'grid',
        properties: {
          rows: 1,
          columns: 1,
        },
      },
      viewports: [
        {
          viewportOptions: {
            toolGroupId: 'default',
            displayArea: defaultDisplayArea,
          },
          displaySets: [{ id: 'DCEPost2Axial' }],
        },
      ],
    },
    // Stage 10: Subtraction Post1 Current/Prior - 1x2 grid
    {
      name: 'Subtraction Post1 Current/Prior',
      viewportStructure: {
        type: 'grid',
        layoutType: 'grid',
        properties: {
          rows: 1,
          columns: 2,
        },
      },
      viewports: [
        {
          viewportOptions: {
            toolGroupId: 'default',
            displayArea: defaultDisplayArea,
          },
          displaySets: [{ id: 'SubPost1Axial' }],
        },
        {
          viewportOptions: {
            toolGroupId: 'default',
            displayArea: defaultDisplayArea,
          },
          displaySets: [{ id: 'SubPost1AxialPrior' }],
        },
      ],
    },
    // Stage 11: Subtraction Post1 Axial
    {
      name: 'Subtraction Post1 Axial',
      viewportStructure: {
        type: 'grid',
        layoutType: 'grid',
        properties: {
          rows: 1,
          columns: 1,
        },
      },
      viewports: [
        {
          viewportOptions: {
            toolGroupId: 'default',
            displayArea: defaultDisplayArea,
          },
          displaySets: [{ id: 'SubPost1Axial' }],
        },
      ],
    },
    // Stage 12: DWI Current/Prior - 1x2 grid
    {
      name: 'DWI Current/Prior',
      viewportStructure: {
        type: 'grid',
        layoutType: 'grid',
        properties: {
          rows: 1,
          columns: 2,
        },
      },
      viewports: [
        {
          viewportOptions: {
            toolGroupId: 'default',
            displayArea: defaultDisplayArea,
          },
          displaySets: [{ id: 'DWIAxial' }],
        },
        {
          viewportOptions: {
            toolGroupId: 'default',
            displayArea: defaultDisplayArea,
          },
          displaySets: [{ id: 'DWIAxialPrior' }],
        },
      ],
    },
    // Stage 13: DWI Axial
    {
      name: 'DWI Axial',
      viewportStructure: {
        type: 'grid',
        layoutType: 'grid',
        properties: {
          rows: 1,
          columns: 1,
        },
      },
      viewports: [
        {
          viewportOptions: {
            toolGroupId: 'default',
            displayArea: defaultDisplayArea,
          },
          displaySets: [{ id: 'DWIAxial' }],
        },
      ],
    },
    // Stage 14: MIP Current/Prior - 1x2 grid
    {
      name: 'MIP Current/Prior',
      viewportStructure: {
        type: 'grid',
        layoutType: 'grid',
        properties: {
          rows: 1,
          columns: 2,
        },
      },
      viewports: [
        {
          viewportOptions: {
            toolGroupId: 'default',
            displayArea: defaultDisplayArea,
          },
          displaySets: [{ id: 'MIPAxial' }],
        },
        {
          viewportOptions: {
            toolGroupId: 'default',
            displayArea: defaultDisplayArea,
          },
          displaySets: [{ id: 'MIPAxialPrior' }],
        },
      ],
    },
    // Stage 15: MIP Axial
    {
      name: 'MIP Axial',
      viewportStructure: {
        type: 'grid',
        layoutType: 'grid',
        properties: {
          rows: 1,
          columns: 1,
        },
      },
      viewports: [
        {
          viewportOptions: {
            toolGroupId: 'default',
            displayArea: defaultDisplayArea,
          },
          displaySets: [{ id: 'MIPAxial' }],
        },
      ],
    },
    // Stage 16: T1 Non-Fat-Sat Current/Prior - 1x2 grid
    {
      name: 'T1 Non-Fat-Sat Current/Prior',
      viewportStructure: {
        type: 'grid',
        layoutType: 'grid',
        properties: {
          rows: 1,
          columns: 2,
        },
      },
      viewports: [
        {
          viewportOptions: {
            toolGroupId: 'default',
            displayArea: defaultDisplayArea,
          },
          displaySets: [{ id: 'T1NonFatSatAxial' }],
        },
        {
          viewportOptions: {
            toolGroupId: 'default',
            displayArea: defaultDisplayArea,
          },
          displaySets: [{ id: 'T1NonFatSatAxialPrior' }],
        },
      ],
    },
    // Stage 17: T1 Non-Fat-Sat Axial
    {
      name: 'T1 Non-Fat-Sat Axial',
      viewportStructure: {
        type: 'grid',
        layoutType: 'grid',
        properties: {
          rows: 1,
          columns: 1,
        },
      },
      viewports: [
        {
          viewportOptions: {
            toolGroupId: 'default',
            displayArea: defaultDisplayArea,
          },
          displaySets: [{ id: 'T1NonFatSatAxial' }],
        },
      ],
    },
    // Stage 18: T2-T1 Pre-DCE Post1-DCE Post2 (2x2 grid)
    {
      name: 'T2-T1 Pre-DCE Post1-DCE Post2',
      viewportStructure: {
        type: 'grid',
        layoutType: 'grid',
        properties: {
          rows: 2,
          columns: 2,
        },
      },
      viewports: [
        {
          viewportOptions: {
            toolGroupId: 'default',
            displayArea: defaultDisplayArea,
          },
          displaySets: [{ id: 'T2Axial' }],
        },
        {
          viewportOptions: {
            toolGroupId: 'default',
            displayArea: defaultDisplayArea,
          },
          displaySets: [{ id: 'T1PreAxial' }],
        },
        {
          viewportOptions: {
            toolGroupId: 'default',
            displayArea: defaultDisplayArea,
          },
          displaySets: [{ id: 'DCEPost1Axial' }],
        },
        {
          viewportOptions: {
            toolGroupId: 'default',
            displayArea: defaultDisplayArea,
          },
          displaySets: [{ id: 'DCEPost2Axial' }],
        },
      ],
    },
    // Stage 19: T1 Pre-DCE Post1-DCE Post2-Sub (2x2 grid)
    {
      name: 'T1 Pre-DCE Post1-DCE Post2-Sub',
      viewportStructure: {
        type: 'grid',
        layoutType: 'grid',
        properties: {
          rows: 2,
          columns: 2,
        },
      },
      viewports: [
        {
          viewportOptions: {
            toolGroupId: 'default',
            displayArea: defaultDisplayArea,
          },
          displaySets: [{ id: 'T1PreAxial' }],
        },
        {
          viewportOptions: {
            toolGroupId: 'default',
            displayArea: defaultDisplayArea,
          },
          displaySets: [{ id: 'DCEPost1Axial' }],
        },
        {
          viewportOptions: {
            toolGroupId: 'default',
            displayArea: defaultDisplayArea,
          },
          displaySets: [{ id: 'DCEPost2Axial' }],
        },
        {
          viewportOptions: {
            toolGroupId: 'default',
            displayArea: defaultDisplayArea,
          },
          displaySets: [{ id: 'SubPost1Axial' }],
        },
      ],
    },
  ],
  // Indicates it is prior aware, but will work with no priors
  numberOfPriorsReferenced: 0,
};

export default hpMR;
