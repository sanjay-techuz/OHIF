import { Coronal, MIP, PostContrast, Sagittal, T1, T2 } from './utils/mrDisplaySetSelector';

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
  ],
  toolGroupIds: ['default'],
  displaySetSelectors: {
    T1,
    T2,
    Sagittal,
    PostContrast,
    MIP,
    Coronal,
  },
  stages: [
    // Default stage: 2x3 grid (6 viewports)
    // Row 1: T1, T2, Sagittal
    // Row 2: Post-Contrast, MIP, Coronal
    {
      name: 'Default MRI View',
      viewportStructure: {
        type: 'grid',
        layoutType: 'grid',
        properties: {
          rows: 2,
          columns: 3,
        },
      },
      viewports: [
        // Row 1, Column 1: T1
        {
          viewportOptions: {
            toolGroupId: 'default',
            displayArea: defaultDisplayArea,
          },
          displaySets: [{ id: 'T1' }],
        },
        // Row 1, Column 2: T2
        {
          viewportOptions: {
            toolGroupId: 'default',
            displayArea: defaultDisplayArea,
          },
          displaySets: [{ id: 'T2' }],
        },
        // Row 1, Column 3: Sagittal
        {
          viewportOptions: {
            toolGroupId: 'default',
            displayArea: defaultDisplayArea,
          },
          displaySets: [{ id: 'Sagittal' }],
        },
        // Row 2, Column 1: Post-Contrast
        {
          viewportOptions: {
            toolGroupId: 'default',
            displayArea: defaultDisplayArea,
          },
          displaySets: [{ id: 'PostContrast' }],
        },
        // Row 2, Column 2: MIP
        {
          viewportOptions: {
            toolGroupId: 'default',
            displayArea: defaultDisplayArea,
          },
          displaySets: [{ id: 'MIP' }],
        },
        // Row 2, Column 3: Coronal
        {
          viewportOptions: {
            toolGroupId: 'default',
            displayArea: defaultDisplayArea,
          },
          displaySets: [{ id: 'Coronal' }],
        },
      ],
    },
  ],
  // Indicates it is prior aware, but will work with no priors
  numberOfPriorsReferenced: 0,
};

export default hpMR;
