import {
  ADC,
  Coronal,
  DWI,
  MIPRL,
  MIPSI,
  SagittalL,
  SagittalR,
  STIR,
  T1,
  Vibrant2,
  Vibrant5,
} from './utils/mrDisplaySetSelector';

// @author Sanjay Balai
// Breast MRI hanging protocol — FOUR faculty-specified stages, switchable from
// the toolbar dropdown (like MG). Default stage is picked by the dropdown (1×2
// MIP when a MIP exists, else the first available stage).
//
//   Stage 0 "1×2 MIP":   MIP SI | MIP RL
//   Stage 1 "2×3":       T1 | STIR | Sag R  /  Ph2 | Ph5 | Sag L
//   Stage 2 "2×4":       T1 | STIR | COR | Sag R  /  DWI | ADC | Ph2 | Sag L
//   Stage 3 "2×2":       T1 | STIR  /  Ph2 | Ph5

const defaultDisplayArea = {
  storeAsInitialCamera: true,
};

// One stack viewport bound to a single selector.
const vp = (selectorId: string) => ({
  viewportOptions: {
    toolGroupId: 'default',
    allowUnmatchedView: true,
    displayArea: defaultDisplayArea,
  },
  displaySets: [{ id: selectorId }],
});

const grid = (rows: number, columns: number) => ({
  type: 'grid',
  layoutType: 'grid',
  properties: { rows, columns },
});

const hpMR = {
  id: '@ohif/hpMR',
  hasUpdatedPriorsInformation: false,
  name: 'Breast MRI Hanging Protocol',
  protocolMatchingRules: [
    {
      id: 'MRI',
      weight: 10,
      attribute: 'ModalitiesInStudy',
      constraint: { contains: 'MR' },
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
    T1,
    STIR,
    MIPSI,
    MIPRL,
    Vibrant2,
    Vibrant5,
    Coronal,
    SagittalR,
    SagittalL,
    DWI,
    ADC,
  },
  stages: [
    // ---- Stage 0: 1×2 — MIP SI | MIP RL ----
    {
      name: 'MRI MIP',
      viewportStructure: grid(1, 2),
      viewports: [vp('MIPSI'), vp('MIPRL')],
    },
    // ---- Stage 1: 2×3 — T1 | STIR | Sag R  /  Ph2 | Ph5 | Sag L ----
    {
      name: 'MRI 2x3',
      viewportStructure: grid(2, 3),
      viewports: [
        vp('T1'),
        vp('STIR'),
        vp('SagittalR'),
        vp('Vibrant2'),
        vp('Vibrant5'),
        vp('SagittalL'),
      ],
    },
    // ---- Stage 2: 2×4 — T1 | STIR | COR | Sag R  /  DWI | ADC | Ph2 | Sag L ----
    {
      name: 'MRI 2x4',
      viewportStructure: grid(2, 4),
      viewports: [
        vp('T1'),
        vp('STIR'),
        vp('Coronal'),
        vp('SagittalR'),
        vp('DWI'),
        vp('ADC'),
        vp('Vibrant2'),
        vp('SagittalL'),
      ],
    },
    // ---- Stage 3: 2×2 — T1 | STIR  /  Ph2 | Ph5 ----
    {
      name: 'MRI 2x2',
      viewportStructure: grid(2, 2),
      viewports: [vp('T1'), vp('STIR'), vp('Vibrant2'), vp('Vibrant5')],
    },
  ],
  numberOfPriorsReferenced: 0,
};

export default hpMR;
