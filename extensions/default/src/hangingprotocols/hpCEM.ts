import {
    LCC_LE,
    LCC_Recomb,
    LMLO_LE,
    LMLO_Recomb,
    RCC_LE,
    RCC_Recomb,
    RMLO_LE,
    RMLO_Recomb,
} from './utils/cemDisplaySetSelector';

/**
 * @author Sanjay Balai
 * @description CEM (Contrast-Enhanced Mammography) hanging protocol.
 *
 * 7 stages — default is "paired per view" (Option A): for each of the 4
 * standard mammo views, the LE and Recombined images sit side-by-side so
 * radiologists can compare conventional MG appearance against contrast
 * uptake at a glance. Stages 1-2 surface all-LE / all-Recombined for the
 * times they want to read either set as a unit. Stages 3-6 zoom into a
 * single view's LE/Recombined pair.
 *
 * Detection: protocol applies when a study contains MG images AND at
 * least one of them is RECOMBINED. The `HangingProtocolDropdown.tsx`
 * also short-circuits the MG protocol when `modalitySlug === 'CEM'` so
 * admin-tagged CEM cases route here even before display sets load.
 *
 * Mirror layout (R on the screen's left, L on the right) matches the
 * radiographer-style hanging that hpMammo already uses — radiologists
 * read CC and MLO with R-on-left by convention.
 */

const defaultDisplayArea = {
  storeAsInitialCamera: true,
};

const hpCEM = {
  id: '@ohif/hpCEM',
  hasUpdatedPriorsInformation: false,
  name: 'Contrast-Enhanced Mammography',
  protocolMatchingRules: [
    {
      id: 'CEM-Modality',
      weight: 10,
      attribute: 'ModalitiesInStudy',
      constraint: { contains: 'MG' },
      required: true,
    },
    {
      id: 'CEM-Recombined',
      // Match when ANY display set in the study has ImageType
      // containing 'RECOMBINED'. This is the hallmark of CEM —
      // a plain MG study would never produce a recombined image.
      weight: 15,
      attribute: 'ImageType',
      constraint: { contains: 'RECOMBINED' },
      required: true,
    },
    {
      id: 'numberOfImages',
      attribute: 'numberOfDisplaySetsWithImages',
      constraint: { greaterThan: 0 },
      required: true,
    },
  ],
  toolGroupIds: ['default'],
  displaySetSelectors: {
    RCC_LE,
    LCC_LE,
    RMLO_LE,
    LMLO_LE,
    RCC_Recomb,
    LCC_Recomb,
    RMLO_Recomb,
    LMLO_Recomb,
  },
  callbacks: {
    onViewportDataInitialized: [
      // Reuse the MG zoom-fit callback — CEM LE images have the same
      // chest-wall geometry as standard mammo so the same auto-zoom
      // anchoring works correctly.
      { commandName: 'setMammographyZoomConditional', commandOptions: {} },
    ],
  },

  stages: [
    // ---- Stage 0 (default): Paired per view (2x4) ----
    // Mirror columns so R views are on the screen-left, L on the right.
    //   Row 1: RCC-LE | RCC-Recomb | LCC-Recomb | LCC-LE
    //   Row 2: RMLO-LE | RMLO-Recomb | LMLO-Recomb | LMLO-LE
    {
      name: 'Paired LE/Recombined (All)',
      viewportStructure: {
        type: 'grid',
        layoutType: 'grid',
        properties: { rows: 2, columns: 4 },
      },
      viewports: [
        {
          viewportOptions: { toolGroupId: 'default', displayArea: defaultDisplayArea },
          displaySets: [{ id: 'RCC_LE' }],
        },
        {
          viewportOptions: { toolGroupId: 'default', displayArea: defaultDisplayArea },
          displaySets: [{ id: 'RCC_Recomb' }],
        },
        {
          viewportOptions: { toolGroupId: 'default', displayArea: defaultDisplayArea },
          displaySets: [{ id: 'LCC_Recomb' }],
        },
        {
          viewportOptions: { toolGroupId: 'default', displayArea: defaultDisplayArea },
          displaySets: [{ id: 'LCC_LE' }],
        },
        {
          viewportOptions: { toolGroupId: 'default', displayArea: defaultDisplayArea },
          displaySets: [{ id: 'RMLO_LE' }],
        },
        {
          viewportOptions: { toolGroupId: 'default', displayArea: defaultDisplayArea },
          displaySets: [{ id: 'RMLO_Recomb' }],
        },
        {
          viewportOptions: { toolGroupId: 'default', displayArea: defaultDisplayArea },
          displaySets: [{ id: 'LMLO_Recomb' }],
        },
        {
          viewportOptions: { toolGroupId: 'default', displayArea: defaultDisplayArea },
          displaySets: [{ id: 'LMLO_LE' }],
        },
      ],
    },

    // ---- Stage 1: All LE (1x4) ----
    {
      name: 'All Low-Energy',
      viewportStructure: {
        type: 'grid',
        layoutType: 'grid',
        properties: { rows: 1, columns: 4 },
      },
      viewports: [
        {
          viewportOptions: { toolGroupId: 'default', displayArea: defaultDisplayArea },
          displaySets: [{ id: 'RCC_LE' }],
        },
        {
          viewportOptions: { toolGroupId: 'default', displayArea: defaultDisplayArea },
          displaySets: [{ id: 'LCC_LE' }],
        },
        {
          viewportOptions: { toolGroupId: 'default', displayArea: defaultDisplayArea },
          displaySets: [{ id: 'RMLO_LE' }],
        },
        {
          viewportOptions: { toolGroupId: 'default', displayArea: defaultDisplayArea },
          displaySets: [{ id: 'LMLO_LE' }],
        },
      ],
    },

    // ---- Stage 2: All Recombined (1x4) ----
    {
      name: 'All Recombined',
      viewportStructure: {
        type: 'grid',
        layoutType: 'grid',
        properties: { rows: 1, columns: 4 },
      },
      viewports: [
        {
          viewportOptions: { toolGroupId: 'default', displayArea: defaultDisplayArea },
          displaySets: [{ id: 'RCC_Recomb' }],
        },
        {
          viewportOptions: { toolGroupId: 'default', displayArea: defaultDisplayArea },
          displaySets: [{ id: 'LCC_Recomb' }],
        },
        {
          viewportOptions: { toolGroupId: 'default', displayArea: defaultDisplayArea },
          displaySets: [{ id: 'RMLO_Recomb' }],
        },
        {
          viewportOptions: { toolGroupId: 'default', displayArea: defaultDisplayArea },
          displaySets: [{ id: 'LMLO_Recomb' }],
        },
      ],
    },

    // ---- Stage 3: R CC pair (1x2) ----
    {
      name: 'R CC: LE vs Recombined',
      viewportStructure: {
        type: 'grid',
        layoutType: 'grid',
        properties: { rows: 1, columns: 2 },
      },
      viewports: [
        {
          viewportOptions: { toolGroupId: 'default', displayArea: defaultDisplayArea },
          displaySets: [{ id: 'RCC_LE' }],
        },
        {
          viewportOptions: { toolGroupId: 'default', displayArea: defaultDisplayArea },
          displaySets: [{ id: 'RCC_Recomb' }],
        },
      ],
    },

    // ---- Stage 4: L CC pair (1x2) ----
    {
      name: 'L CC: LE vs Recombined',
      viewportStructure: {
        type: 'grid',
        layoutType: 'grid',
        properties: { rows: 1, columns: 2 },
      },
      viewports: [
        {
          viewportOptions: { toolGroupId: 'default', displayArea: defaultDisplayArea },
          displaySets: [{ id: 'LCC_LE' }],
        },
        {
          viewportOptions: { toolGroupId: 'default', displayArea: defaultDisplayArea },
          displaySets: [{ id: 'LCC_Recomb' }],
        },
      ],
    },

    // ---- Stage 5: R MLO pair (1x2) ----
    {
      name: 'R MLO: LE vs Recombined',
      viewportStructure: {
        type: 'grid',
        layoutType: 'grid',
        properties: { rows: 1, columns: 2 },
      },
      viewports: [
        {
          viewportOptions: { toolGroupId: 'default', displayArea: defaultDisplayArea },
          displaySets: [{ id: 'RMLO_LE' }],
        },
        {
          viewportOptions: { toolGroupId: 'default', displayArea: defaultDisplayArea },
          displaySets: [{ id: 'RMLO_Recomb' }],
        },
      ],
    },

    // ---- Stage 6: L MLO pair (1x2) ----
    {
      name: 'L MLO: LE vs Recombined',
      viewportStructure: {
        type: 'grid',
        layoutType: 'grid',
        properties: { rows: 1, columns: 2 },
      },
      viewports: [
        {
          viewportOptions: { toolGroupId: 'default', displayArea: defaultDisplayArea },
          displaySets: [{ id: 'LMLO_LE' }],
        },
        {
          viewportOptions: { toolGroupId: 'default', displayArea: defaultDisplayArea },
          displaySets: [{ id: 'LMLO_Recomb' }],
        },
      ],
    },
  ],
  numberOfPriorsReferenced: 0,
};

export default hpCEM;
