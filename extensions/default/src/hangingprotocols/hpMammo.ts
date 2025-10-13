import {
  LCC,
  LCCPrior,
  LMLO,
  LMLOPrior,
  RCC,
  RCCPrior,
  RMLO,
  RMLOPrior,
} from './utils/mammoDisplaySetSelector';

const rightDisplayArea = {
  storeAsInitialCamera: true,
  imageArea: [0.8, 0.8],
  imageCanvasPoint: {
    imagePoint: [0, 0.5],
    canvasPoint: [0, 0.5],
  },
};

const leftDisplayArea = {
  storeAsInitialCamera: true,
  imageArea: [0.8, 0.8],
  imageCanvasPoint: {
    imagePoint: [1, 0.5],
    canvasPoint: [1, 0.5],
  },
};

// Default display area with 1.5x zoom for mammography
const defaultDisplayArea = {
  storeAsInitialCamera: true,
  // Set default zoom to 1.5x for mammography
  // scale: 1.5,
};

const hpMammography = {
  id: '@ohif/hpMammo',
  hasUpdatedPriorsInformation: false,
  name: 'Mammography Breast Screening',
  protocolMatchingRules: [
    {
      id: 'Mammography',
      weight: 10,
      attribute: 'ModalitiesInStudy',
      constraint: {
        contains: 'MG',
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
    RCC,
    LCC,
    RMLO,
    LMLO,
    RCCPrior,
    LCCPrior,
    RMLOPrior,
    LMLOPrior,
  },
  // Add callback to set zoom for mammography with condition
  callbacks: {
    onViewportDataInitialized: [
      {
        commandName: 'setMammographyZoomConditional',
        commandOptions: {},
      },
    ],
  },

  stages: [
    {
      name: 'CC/MLO',
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
            displayArea: leftDisplayArea,
            // flipHorizontal: true,
            // rotation: 180,
            allowUnmatchedView: true,
          },
          displaySets: [
            {
              id: 'RCC',
            },
          ],
        },
        {
          viewportOptions: {
            toolGroupId: 'default',
            // flipHorizontal: true,
            displayArea: rightDisplayArea,
            allowUnmatchedView: true,
          },
          displaySets: [
            {
              id: 'LCC',
            },
          ],
        },
        {
          viewportOptions: {
            toolGroupId: 'default',
            displayArea: leftDisplayArea,
            // rotation: 180,
            // flipHorizontal: true,
            allowUnmatchedView: true,
          },
          displaySets: [
            {
              id: 'RMLO',
            },
          ],
        },
        {
          viewportOptions: {
            toolGroupId: 'default',
            displayArea: rightDisplayArea,
            // flipHorizontal: true,
            allowUnmatchedView: true,
          },
          displaySets: [
            {
              id: 'LMLO',
            },
          ],
        },
      ],
    },

    // Compare CC current/prior top/bottom
    {
      name: 'CC compare',
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
            displayArea: leftDisplayArea,
            flipHorizontal: true,
            rotation: 180,
          },
          displaySets: [
            {
              id: 'RCC',
            },
          ],
        },
        {
          viewportOptions: {
            toolGroupId: 'default',
            flipHorizontal: true,
            displayArea: rightDisplayArea,
          },
          displaySets: [
            {
              id: 'LCC',
            },
          ],
        },
        {
          viewportOptions: {
            toolGroupId: 'default',
            displayArea: leftDisplayArea,
            flipHorizontal: true,
          },
          displaySets: [
            {
              id: 'RCCPrior',
            },
          ],
        },
        {
          viewportOptions: {
            toolGroupId: 'default',
            displayArea: rightDisplayArea,
          },
          displaySets: [
            {
              id: 'LCCPrior',
            },
          ],
        },
      ],
    },
    // New: All (2x2 grid)
    {
      name: 'All',
      viewportStructure: {
        type: 'grid',
        layoutType: 'grid',
        properties: {
          rows: 1,
          columns: 4,
        },
      },
      viewports: [
        {
          viewportOptions: {
            toolGroupId: 'default',
            displayArea: defaultDisplayArea,
          },
          displaySets: [{ id: 'RCC' }],
        },
        {
          viewportOptions: {
            toolGroupId: 'default',
            displayArea: defaultDisplayArea,
          },
          displaySets: [{ id: 'LCC' }],
        },
        {
          viewportOptions: {
            toolGroupId: 'default',
            displayArea: defaultDisplayArea,
          },
          displaySets: [{ id: 'RMLO' }],
        },
        {
          viewportOptions: {
            toolGroupId: 'default',
            displayArea: defaultDisplayArea,
          },
          displaySets: [{ id: 'LMLO' }],
        },
      ],
    },
    // New: Right-Left CC (1x2)
    {
      name: 'Right-Left CC',
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
          displaySets: [{ id: 'RCC' }],
        },
        {
          viewportOptions: {
            toolGroupId: 'default',
            displayArea: defaultDisplayArea,
          },
          displaySets: [{ id: 'LCC' }],
        },
      ],
    },
    // New: Right-Left MLO (1x2)
    {
      name: 'Right-Left MLO',
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
          },
          displaySets: [{ id: 'RMLO' }],
        },
        {
          viewportOptions: {
            toolGroupId: 'default',
          },
          displaySets: [{ id: 'LMLO' }],
        },
      ],
    },
    // New: Right CC-Right MLO (1x2)
    {
      name: 'Right CC-Right MLO',
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
          },
          displaySets: [{ id: 'RCC' }],
        },
        {
          viewportOptions: {
            toolGroupId: 'default',
          },
          displaySets: [{ id: 'RMLO' }],
        },
      ],
    },
    // New: Left CC-Left MLO (1x2)
    {
      name: 'Left CC-Left MLO',
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
          },
          displaySets: [{ id: 'LCC' }],
        },
        {
          viewportOptions: {
            toolGroupId: 'default',
          },
          displaySets: [{ id: 'LMLO' }],
        },
      ],
    },
    // Stage 7: RCC-LCC-TOP (Hidden from dropdown, keyboard navigation only)
    {
      id: 'mammoStage7',
      name: 'RCC-LCC-TOP',
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
          displaySets: [{ id: 'RCC' }],
        },
        {
          viewportOptions: {
            toolGroupId: 'default',
            displayArea: defaultDisplayArea,
          },
          displaySets: [{ id: 'LCC' }],
        },
      ],
      // Apply 2x zoom and pan to top 50% (no default zoom for partial views)
      onViewportDataInitialized: [
        {
          commandName: 'setMammographyPartialView',
          commandOptions: { verticalAlignment: 'top' },
        },
      ],
    },
    // Stage 8: RCC-LCC-BOTTOM (Hidden from dropdown, keyboard navigation only)
    {
      id: 'mammoStage8',
      name: 'RCC-LCC-BOTTOM',
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
          displaySets: [{ id: 'RCC' }],
        },
        {
          viewportOptions: {
            toolGroupId: 'default',
            displayArea: defaultDisplayArea,
          },
          displaySets: [{ id: 'LCC' }],
        },
      ],
      // Apply 2x zoom and pan to bottom 50% (no default zoom for partial views)
      onViewportDataInitialized: [
        {
          commandName: 'setMammographyPartialView',
          commandOptions: { verticalAlignment: 'bottom' },
        },
      ],
    },
    // Stage 9: RMLO-LMLO-TOP (Hidden from dropdown, keyboard navigation only)
    {
      id: 'mammoStage9',
      name: 'RMLO-LMLO-TOP',
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
          displaySets: [{ id: 'RMLO' }],
        },
        {
          viewportOptions: {
            toolGroupId: 'default',
            displayArea: defaultDisplayArea,
          },
          displaySets: [{ id: 'LMLO' }],
        },
      ],
      // Apply 2x zoom and pan to top 50% (no default zoom for partial views)
      onViewportDataInitialized: [
        {
          commandName: 'setMammographyPartialView',
          commandOptions: { verticalAlignment: 'top' },
        },
      ],
    },
    // Stage 10: RMLO-LMLO-BOTTOM (Hidden from dropdown, keyboard navigation only)
    {
      id: 'mammoStage10',
      name: 'RMLO-LMLO-BOTTOM',
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
          displaySets: [{ id: 'RMLO' }],
        },
        {
          viewportOptions: {
            toolGroupId: 'default',
            displayArea: defaultDisplayArea,
          },
          displaySets: [{ id: 'LMLO' }],
        },
      ],
      // Apply 2x zoom and pan to bottom 50% (no default zoom for partial views)
      onViewportDataInitialized: [
        {
          commandName: 'setMammographyPartialView',
          commandOptions: { verticalAlignment: 'bottom' },
        },
      ],
    },
  ],
  // Indicates it is prior aware, but will work with no priors
  numberOfPriorsReferenced: 0,
};

export default hpMammography;
