import {
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
    // DBT display set selectors
    RCC3D,
    LCC3D,
    RMLO3D,
    LMLO3D,
    RCC3DPrior,
    LCC3DPrior,
    RMLO3DPrior,
    LMLO3DPrior,
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
    // New: All Prior and Current (2x4 grid) stage-0
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
        {
          viewportOptions: {
            toolGroupId: 'default',
            displayArea: defaultDisplayArea,
          },
          displaySets: [{ id: 'RCCPrior' }],
        },
        {
          viewportOptions: {
            toolGroupId: 'default',
            displayArea: defaultDisplayArea,
          },
          displaySets: [{ id: 'LCCPrior' }],
        },
        {
          viewportOptions: {
            toolGroupId: 'default',
            displayArea: defaultDisplayArea,
          },
          displaySets: [{ id: 'RMLOPrior' }],
        },
        {
          viewportOptions: {
            toolGroupId: 'default',
            displayArea: defaultDisplayArea,
          },
          displaySets: [{ id: 'LMLOPrior' }],
        },
      ],
    },

    // Compare CC current/prior top/bottom stage-1
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
    // New: All Current (2x2 grid) stage-2
    {
      name: 'All Current',
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
    // New: Right-Left CC (1x2) stage-3
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
    // New: Right CC Current/Prior (1x2) stage-4
    {
      name: 'Right CC Current/Prior',
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
          displaySets: [{ id: 'RCCPrior' }],
        },
      ],
    },
    // New: Left CC Current/Prior (1x2) stage-5
    {
      name: 'Left CC Current/Prior',
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
          displaySets: [{ id: 'LCC' }],
        },
        {
          viewportOptions: {
            toolGroupId: 'default',
            displayArea: defaultDisplayArea,
          },
          displaySets: [{ id: 'LCCPrior' }],
        },
      ],
    },
    // New: Right-Left MLO (1x2) stage-6
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
    // New: Right MLO Current/Prior (1x2) stage-7
    {
      name: 'Right MLO Current/Prior',
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
          displaySets: [{ id: 'RMLOPrior' }],
        },
      ],
    },
    // New: Left MLO Current/Prior (1x2) stage-8
    {
      name: 'Left MLO Current/Prior',
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
          displaySets: [{ id: 'LMLO' }],
        },
        {
          viewportOptions: {
            toolGroupId: 'default',
          },
          displaySets: [{ id: 'LMLOPrior' }],
        },
      ],
    },
    // New: Right CC-Right MLO (1x2) stage-9
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
    // New: Left CC-Left MLO (1x2) stage-10
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
    // DBT Stages (11)
    // New: DBT All (1x4 grid) stage-11
    {
      name: 'DBT All',
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
          displaySets: [{ id: 'RCC3D' }],
        },
        {
          viewportOptions: {
            toolGroupId: 'default',
            displayArea: defaultDisplayArea,
          },
          displaySets: [{ id: 'LCC3D' }],
        },
        {
          viewportOptions: {
            toolGroupId: 'default',
            displayArea: defaultDisplayArea,
          },
          displaySets: [{ id: 'RMLO3D' }],
        },
        {
          viewportOptions: {
            toolGroupId: 'default',
            displayArea: defaultDisplayArea,
          },
          displaySets: [{ id: 'LMLO3D' }],
        },
      ],
    },
    // New: DBT Right CC (1x2) stage-12
    {
      name: 'DBT Right CC',
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
          displaySets: [{ id: 'RCC3D' }],
        },
      ],
    },
    // New: DBT Right MLO (1x2) stage-13
    {
      name: 'DBT Right MLO',
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
          displaySets: [{ id: 'RMLO3D' }],
        },
      ],
    },
    // New: DBT Left CC (1x2) stage-14
    {
      name: 'DBT Left CC',
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
          displaySets: [{ id: 'LCC3D' }],
        },
      ],
    },
    // New: DBT Left MLO (1x2) stage-15
    {
      name: 'DBT Left MLO',
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
          displaySets: [{ id: 'LMLO' }],
        },
        {
          viewportOptions: {
            toolGroupId: 'default',
          },
          displaySets: [{ id: 'LMLO3D' }],
        },
      ],
    },
    // New: RCC-LCC-TOP (Hidden from dropdown, keyboard navigation only) stage-16
    {
      id: 'mammoStage16',
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
      // Apply 2x zoom and pan to top 33% (no default zoom for partial views)
      onViewportDataInitialized: [
        {
          commandName: 'setMammographyZoomConditional',
          commandOptions: { verticalAlignment: 'top' },
        },
      ],
    },
    // New: RCC-LCC-CENTER (Hidden from dropdown, keyboard navigation only) stage-17
    {
      id: 'mammoStage17',
      name: 'RCC-LCC-CENTER',
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
      // Apply 2x zoom and pan to center 33% (no default zoom for partial views)
      onViewportDataInitialized: [
        {
          commandName: 'setMammographyZoomConditional',
          commandOptions: { verticalAlignment: 'center' },
        },
      ],
    },
    // New: RCC-LCC-BOTTOM (Hidden from dropdown, keyboard navigation only) stage-18
    {
      id: 'mammoStage18',
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
      // Apply 2x zoom and pan to bottom 33% (no default zoom for partial views)
      onViewportDataInitialized: [
        {
          commandName: 'setMammographyZoomConditional',
          commandOptions: { verticalAlignment: 'bottom' },
        },
      ],
    },
    // New: RMLO-LMLO-TOP (Hidden from dropdown, keyboard navigation only) stage-19
    {
      id: 'mammoStage19',
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
      // Apply 2x zoom and pan to top 33% (no default zoom for partial views)
      onViewportDataInitialized: [
        {
          commandName: 'setMammographyZoomConditional',
          commandOptions: { verticalAlignment: 'top' },
        },
      ],
    },
    // New: RMLO-LMLO-CENTER (Hidden from dropdown, keyboard navigation only) stage-20
    {
      id: 'mammoStage20',
      name: 'RMLO-LMLO-CENTER',
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
      // Apply 2x zoom and pan to center 33% (no default zoom for partial views)
      onViewportDataInitialized: [
        {
          commandName: 'setMammographyZoomConditional',
          commandOptions: { verticalAlignment: 'center' },
        },
      ],
    },
    // New: RMLO-LMLO-BOTTOM (Hidden from dropdown, keyboard navigation only) stage-21
    {
      id: 'mammoStage21',
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
      // Apply 2x zoom and pan to bottom 33% (no default zoom for partial views)
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
