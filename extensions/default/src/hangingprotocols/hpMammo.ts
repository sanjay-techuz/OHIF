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

// Centered fit used for the normal (non-partial-view) MG stages.
// `imageArea: [1.0, 1.0]` tells cornerstone to scale the image so the
// constraining dimension (width for a tall MG image in a tall narrow
// viewport) exactly fills the canvas — no cutoff on the sides, no
// chest-wall pinning. The cornerstone math is
//   absZoom = currentScale / (areaX * imgWidth/canvasWidth)
// so `areaX = 1.0` gives absZoom = 1.0, then `setZoom(1.1 * 1.0)`
// cancels the 10% `insetImageMultiplier` cornerstone bakes into its
// fit-to-canvas camera. End result: image fills 100% of canvas width
// (or height, whichever is constraining) with no cutoff. Anything smaller
// (e.g. 0.9) OVERSHOOTS and cuts off the sides — that's the symptom we
// saw on main OHIF after Reset until the user opened/closed the sidebar
// (which forced a viewport-resize that recomputed the camera).
// Partial-view stages 16-21 KEEP `defaultDisplayArea` (no imageArea) so
// the zoom command's 2× + top/center/bottom pan math continues to work.
// Stages with chest-wall pinning (`leftDisplayArea` / `rightDisplayArea`)
// also stay as-is — that pinning is intentional, not a fit-to-canvas case.
const centeredFitDisplayArea = {
  storeAsInitialCamera: true,
  imageArea: [1.0, 1.0],
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
      // Only make this the auto-selected default when a PRIOR study is actually
      // present. Without this gate, `_updateStageStatus` marks the stage
      // "enabled" as soon as the 4 CURRENT viewports match (a no-prior study),
      // and `_findStageIndex` returns the first enabled stage — so every MG
      // study opened here (8-viewport grid with 4 empty prior panes) instead of
      // the 4-up "All Current" (stage 2). The 8 viewports are 4 current + 4
      // prior, so requiring >4 matches means "at least one prior view exists".
      // When no prior, the stage becomes 'passive' (still manually selectable
      // from the dropdown) and OHIF falls through to stage 2. Mirrors the
      // stageActivation pattern used by hpCompare.ts.
      stageActivation: {
        enabled: {
          minViewportsMatched: 5,
        },
      },
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
            displayArea: centeredFitDisplayArea,
          },
          displaySets: [{ id: 'RCC' }],
        },
        {
          viewportOptions: {
            toolGroupId: 'default',
            displayArea: centeredFitDisplayArea,
          },
          displaySets: [{ id: 'LCC' }],
        },
        {
          viewportOptions: {
            toolGroupId: 'default',
            displayArea: centeredFitDisplayArea,
          },
          displaySets: [{ id: 'RMLO' }],
        },
        {
          viewportOptions: {
            toolGroupId: 'default',
            displayArea: centeredFitDisplayArea,
          },
          displaySets: [{ id: 'LMLO' }],
        },
        {
          viewportOptions: {
            toolGroupId: 'default',
            displayArea: centeredFitDisplayArea,
          },
          displaySets: [{ id: 'RCCPrior' }],
        },
        {
          viewportOptions: {
            toolGroupId: 'default',
            displayArea: centeredFitDisplayArea,
          },
          displaySets: [{ id: 'LCCPrior' }],
        },
        {
          viewportOptions: {
            toolGroupId: 'default',
            displayArea: centeredFitDisplayArea,
          },
          displaySets: [{ id: 'RMLOPrior' }],
        },
        {
          viewportOptions: {
            toolGroupId: 'default',
            displayArea: centeredFitDisplayArea,
          },
          displaySets: [{ id: 'LMLOPrior' }],
        },
      ],
    },

    // Compare CC current/prior top/bottom stage-1
    {
      name: 'CC compare',
      // Same prior gate as stage 0. This stage is 4 viewports (2 current CC + 2
      // prior CC); require >2 matches so it only auto-selects when a prior CC
      // exists. Otherwise it would become the default for no-prior studies
      // (stage 1 precedes stage 2 in the first-enabled search).
      stageActivation: {
        enabled: {
          minViewportsMatched: 3,
        },
      },
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
            displayArea: centeredFitDisplayArea,
          },
          displaySets: [{ id: 'RCC' }],
        },
        {
          viewportOptions: {
            toolGroupId: 'default',
            displayArea: centeredFitDisplayArea,
          },
          displaySets: [{ id: 'LCC' }],
        },
        {
          viewportOptions: {
            toolGroupId: 'default',
            displayArea: centeredFitDisplayArea,
          },
          displaySets: [{ id: 'RMLO' }],
        },
        {
          viewportOptions: {
            toolGroupId: 'default',
            displayArea: centeredFitDisplayArea,
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
            displayArea: centeredFitDisplayArea,
          },
          displaySets: [{ id: 'RCC' }],
        },
        {
          viewportOptions: {
            toolGroupId: 'default',
            displayArea: centeredFitDisplayArea,
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
            displayArea: centeredFitDisplayArea,
          },
          displaySets: [{ id: 'RCC' }],
        },
        {
          viewportOptions: {
            toolGroupId: 'default',
            displayArea: centeredFitDisplayArea,
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
            displayArea: centeredFitDisplayArea,
          },
          displaySets: [{ id: 'LCC' }],
        },
        {
          viewportOptions: {
            toolGroupId: 'default',
            displayArea: centeredFitDisplayArea,
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
            displayArea: centeredFitDisplayArea,
          },
          displaySets: [{ id: 'RCC3D' }],
        },
        {
          viewportOptions: {
            toolGroupId: 'default',
            displayArea: centeredFitDisplayArea,
          },
          displaySets: [{ id: 'LCC3D' }],
        },
        {
          viewportOptions: {
            toolGroupId: 'default',
            displayArea: centeredFitDisplayArea,
          },
          displaySets: [{ id: 'RMLO3D' }],
        },
        {
          viewportOptions: {
            toolGroupId: 'default',
            displayArea: centeredFitDisplayArea,
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
            displayArea: centeredFitDisplayArea,
          },
          displaySets: [{ id: 'RCC' }],
        },
        {
          viewportOptions: {
            toolGroupId: 'default',
            displayArea: centeredFitDisplayArea,
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
