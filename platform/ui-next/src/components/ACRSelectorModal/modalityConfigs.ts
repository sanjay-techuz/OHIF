/**
 * Modality-specific ACR BI-RADS classification form configurations.
 *
 * To add a new modality: add one entry to MODALITY_ACR_CONFIGS.
 * No other files need modality-specific conditionals.
 *
 * @author Sanjay Balai
 */

// ---------- Types ----------

export interface ACRFieldConfig {
  key: string;
  label: string;
  /** 'dropdown' = select menu, 'chips' = horizontal chip/tab selector */
  type: 'dropdown' | 'chips';
  options: string[];
  placeholder: string;
}

export interface ACRDisplaySegment {
  label: string;
  valueKey: string;
}

export interface ModalityACRConfig {
  modalTitle: string;
  modalSubtitle: string;
  fields: ACRFieldConfig[];
  displaySegments: ACRDisplaySegment[];
  requiredFields: string[];
  defaultValues: Record<string, string>;
}

// ---------- Shared option sets ----------

const DENSITY_OPTIONS = ['A', 'B', 'C', 'D'];
const BIRADS_OPTIONS = ['1', '2', '4', '5'];
const BPE_OPTIONS = ['Minimal', 'Mild', 'Moderate', 'Marked'];

// ---------- Chip color helper ----------

/**
 * Returns the border/ring color for a selected BI-RADS chip value.
 * Normal (1, 2, 3) → green, Abnormal (4*, 5) → red.
 */
export function getBiradsChipColor(value: string): 'green' | 'red' {
  if (value === '1' || value === '2') {
    return 'green';
  }
  return 'red';
}

// ---------- Configs ----------

export const MODALITY_ACR_CONFIGS: Record<string, ModalityACRConfig> = {
  // ── Mammography (2-D) ──────────────────────────────────────
  BR_MG: {
    modalTitle: 'ACR BI-RADS Classification',
    modalSubtitle: 'Select values for Breast Density, Right (R) and Left (L) classifications',
    fields: [
      {
        key: 'acr',
        label: 'Breast Density',
        type: 'dropdown',
        options: DENSITY_OPTIONS,
        placeholder: 'Select Breast Density',
      },
      {
        key: 'r',
        label: 'R (Right Breast)',
        type: 'chips',
        options: BIRADS_OPTIONS,
        placeholder: '',
      },
      {
        key: 'l',
        label: 'L (Left Breast)',
        type: 'chips',
        options: BIRADS_OPTIONS,
        placeholder: '',
      },
    ],
    displaySegments: [
      { label: 'Breast Density', valueKey: 'acr' },
      { label: 'R', valueKey: 'r' },
      { label: 'L', valueKey: 'l' },
    ],
    requiredFields: ['acr', 'r', 'l'],
    defaultValues: { acr: '', r: '', l: '' },
  },

  // ── Digital Breast Tomosynthesis (same as MG) ──────────────
  BR_DBT: {
    modalTitle: 'ACR BI-RADS Classification',
    modalSubtitle: 'Select values for Breast Density, Right (R) and Left (L) classifications',
    fields: [
      {
        key: 'acr',
        label: 'Breast Density',
        type: 'dropdown',
        options: DENSITY_OPTIONS,
        placeholder: 'Select Breast Density',
      },
      {
        key: 'r',
        label: 'R (Right Breast)',
        type: 'chips',
        options: BIRADS_OPTIONS,
        placeholder: '',
      },
      {
        key: 'l',
        label: 'L (Left Breast)',
        type: 'chips',
        options: BIRADS_OPTIONS,
        placeholder: '',
      },
    ],
    displaySegments: [
      { label: 'Breast Density', valueKey: 'acr' },
      { label: 'R', valueKey: 'r' },
      { label: 'L', valueKey: 'l' },
    ],
    requiredFields: ['acr', 'r', 'l'],
    defaultValues: { acr: '', r: '', l: '' },
  },

  // ── Contrast Enhanced Mammography ──────────────────────────
  BR_CEM: {
    modalTitle: 'ACR BI-RADS Classification',
    modalSubtitle:
      'Select values for Breast Density, Background Parenchymal Enhancement (BPE), Right (R) and Left (L) classifications',
    fields: [
      {
        key: 'acr',
        label: 'Breast Density',
        type: 'dropdown',
        options: DENSITY_OPTIONS,
        placeholder: 'Select Breast Density',
      },
      {
        key: 'bpe',
        label: 'Background Parenchymal Enhancement (BPE)',
        type: 'dropdown',
        options: BPE_OPTIONS,
        placeholder: 'Select BPE',
      },
      {
        key: 'r',
        label: 'R (Right Breast)',
        type: 'chips',
        options: BIRADS_OPTIONS,
        placeholder: '',
      },
      {
        key: 'l',
        label: 'L (Left Breast)',
        type: 'chips',
        options: BIRADS_OPTIONS,
        placeholder: '',
      },
    ],
    displaySegments: [
      { label: 'Breast Density', valueKey: 'acr' },
      { label: 'BPE', valueKey: 'bpe' },
      { label: 'R', valueKey: 'r' },
      { label: 'L', valueKey: 'l' },
    ],
    requiredFields: ['acr', 'r', 'l'],
    defaultValues: { acr: '', bpe: '', r: '', l: '' },
  },

  // ── Breast MRI ─────────────────────────────────────────────
  BR_MR: {
    modalTitle: 'ACR BI-RADS Classification',
    modalSubtitle: 'Select values for Background Parenchymal Enhancement (BPE) and Overall BI-RADS',
    fields: [
      {
        key: 'bpe',
        label: 'Background Parenchymal Enhancement (BPE)',
        type: 'dropdown',
        options: BPE_OPTIONS,
        placeholder: 'Select BPE',
      },
      {
        key: 'overall_birads',
        label: 'Overall BI-RADS',
        type: 'chips',
        options: BIRADS_OPTIONS,
        placeholder: '',
      },
    ],
    displaySegments: [
      { label: 'BPE:', valueKey: 'bpe' },
      { label: 'Overall', valueKey: 'overall_birads' },
    ],
    requiredFields: ['bpe', 'overall_birads'],
    defaultValues: { bpe: '', overall_birads: '' },
  },

  // ── Breast Ultrasound ──────────────────────────────────────
  BR_US: {
    modalTitle: 'ACR BI-RADS Classification',
    modalSubtitle: 'Select values for Overall BI-RADS',
    fields: [
      {
        key: 'overall_birads',
        label: 'Overall BI-RADS',
        type: 'chips',
        options: BIRADS_OPTIONS,
        placeholder: '',
      },
    ],
    displaySegments: [{ label: 'Overall', valueKey: 'overall_birads' }],
    requiredFields: ['overall_birads'],
    defaultValues: { overall_birads: '' },
  },
};

// ---------- Lookup helper ----------

/**
 * Returns the ACR form config for a given subspecialty + modality combo.
 * Falls back to BR_MG when no match is found.
 */
export function getModalityConfig(
  subSpecialitySlug: string | null | undefined,
  modalitySlug: string | null | undefined
): ModalityACRConfig {
  const sub = (subSpecialitySlug ?? 'BR').toUpperCase();
  const mod = (modalitySlug ?? 'MG').toUpperCase();
  const key = `${sub}_${mod}`;
  return MODALITY_ACR_CONFIGS[key] ?? MODALITY_ACR_CONFIGS['BR_MG'];
}
