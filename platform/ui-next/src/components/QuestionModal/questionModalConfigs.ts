/**
 * Modality-specific question form configurations for annotation modals.
 *
 * To add a new modality: add one entry to MODALITY_QUESTION_CONFIGS.
 * No other files need modality-specific conditionals.
 *
 * @author Sanjay Balai
 */

// ---------- Types ----------

export type QuestionFieldType = 'chips' | 'dropdown' | 'textarea' | 'toggle' | 'number';

export interface QuestionFieldConfig {
  /** Unique key matching form state (e.g. 'breastDensity', 'mass') */
  key: string;
  label: string;
  type: QuestionFieldType;
  /** Options for chips/dropdown fields */
  options?: string[];
  /** Placeholder text for dropdown/textarea/number */
  placeholder?: string;
  /** Field is required when visible (default false) */
  required?: boolean;
  /** Only show & validate this field when form[field] === value */
  showWhen?: { field: string; value: string };
  /** Render a styled section header before this field */
  sectionHeader?: string;
  /** Use smaller label styling for sub-section items */
  small?: boolean;
  /** Render at half width (consecutive halfWidth fields form a 2-column grid) */
  halfWidth?: boolean;
  /** Render at one-third width (consecutive thirdWidth fields form a 3-column grid) */
  thirdWidth?: boolean;
  /** BI-RADS chip color mode: green for 1,2 / red for 4,5 (default: neutral white) */
  chipColorMode?: 'birads' | 'neutral';
  /** Minimum value for number fields */
  min?: number;
  /** Maximum value for number fields */
  max?: number;
  /** Step increment for number fields (e.g. 0.1 for decimal) */
  step?: number;
  /** Unit label shown next to number fields (e.g. 'mm') */
  unit?: string;
}

export interface QuestionModalityConfig {
  /** Title prefix for annotation numbering: "ROI" → "ROI - 1", "Lesion" → "Lesion - 1" */
  titlePrefix: string;
  /** Form field definitions rendered top-to-bottom */
  fields: QuestionFieldConfig[];
  /** Initial empty state for all form keys */
  defaultValues: Record<string, string>;
  /** Whether saving this form propagates breastDensity to ACR display */
  propagatesBreastDensity?: boolean;
}

// ---------- Shared option sets ----------

const DENSITY_OPTIONS = ['A', 'B', 'C', 'D'];
const YES_NO_OPTIONS = ['Yes', 'No'];
const BIRADS_OPTIONS = ['1', '2', '4', '5'];
const MASS_OPTIONS = ['Benign', 'Suspicious'];
const BPE_OPTIONS = ['Mild', 'Minimal', 'Moderate', 'Marked'];
const ASYMMETRY_OPTIONS = ['Focal', 'Global', 'Developing'];
const NME_OPTIONS = ['Benign', 'Suspicious'];
const SOLID_OPTIONS = ['Benign', 'Suspicious'];
const NON_MASS_LESION_OPTIONS = ['Benign', 'Suspicious'];
const CLOCK_POSITION_OPTIONS = [
  "1 o'clock",
  "2 o'clock",
  "3 o'clock",
  "4 o'clock",
  "5 o'clock",
  "6 o'clock",
  "7 o'clock",
  "8 o'clock",
  "9 o'clock",
  "10 o'clock",
  "11 o'clock",
  "12 o'clock",
];

// ---------- Shared number field ranges ----------
// Based on BI-RADS practice for breast imaging:
// - Size (Largest): lesion measurements in mm, 0-200mm covers all realistic clinical cases
// - DFN (Distance From Nipple): 0-200mm covers full breast depth

const SIZE_FIELD: QuestionFieldConfig = {
  key: 'size',
  label: 'Size (Largest)',
  type: 'number',
  placeholder: '0',
  min: 0,
  max: 200,
  step: 0.1,
  unit: 'mm',
  required: false,
  thirdWidth: true,
};

const DFN_FIELD: QuestionFieldConfig = {
  key: 'dfn',
  label: 'DFN',
  type: 'number',
  placeholder: '0',
  min: 0,
  max: 200,
  step: 0.1,
  unit: 'mm',
  required: false,
  thirdWidth: true,
};

const CLOCK_POSITION_FIELD: QuestionFieldConfig = {
  key: 'clockPosition',
  label: 'Clock Position',
  type: 'dropdown',
  options: CLOCK_POSITION_OPTIONS,
  placeholder: 'Select',
  required: false,
  thirdWidth: true,
};

// ---------- Configs ----------

export const MODALITY_QUESTION_CONFIGS: Record<string, QuestionModalityConfig> = {
  // ── Mammography (2-D) ──────────────────────────────────────
  BR_MG: {
    titlePrefix: 'ROI',
    propagatesBreastDensity: true,
    fields: [
      {
        key: 'breastDensity',
        label: 'Breast Density',
        type: 'chips',
        options: DENSITY_OPTIONS,
        required: false,
      },
      {
        key: 'mass',
        label: 'Mass',
        type: 'dropdown',
        options: MASS_OPTIONS,
        placeholder: 'Select',
        required: false,
        halfWidth: true,
      },
      {
        key: 'microlcalcification',
        label: 'Microcalcification',
        type: 'dropdown',
        options: MASS_OPTIONS,
        placeholder: 'Select',
        required: false,
        halfWidth: true,
      },
      {
        key: 'asymmetry',
        label: 'Asymmetry',
        type: 'dropdown',
        options: ASYMMETRY_OPTIONS,
        placeholder: 'Select',
        required: false,
      },
      {
        key: 'architecturalDistortion',
        label: 'Architectural Distortion',
        type: 'toggle',
        options: YES_NO_OPTIONS,
        required: false,
      },
      SIZE_FIELD,
      DFN_FIELD,
      CLOCK_POSITION_FIELD,
      {
        key: 'associatedAbnormalitySkin',
        label: 'Skin',
        type: 'toggle',
        options: YES_NO_OPTIONS,
        required: false,
        sectionHeader: 'Associated Abnormality',
        small: true,
        halfWidth: true,
      },
      {
        key: 'associatedAbnormalityNipple',
        label: 'Nipple',
        type: 'toggle',
        options: YES_NO_OPTIONS,
        required: false,
        small: true,
        halfWidth: true,
      },
      {
        key: 'associatedAbnormalityLymphNode',
        label: 'Lymph Node',
        type: 'toggle',
        options: YES_NO_OPTIONS,
        required: false,
        small: true,
        halfWidth: true,
      },
      {
        key: 'biRads',
        label: 'BI-RADS',
        type: 'chips',
        options: BIRADS_OPTIONS,
        required: true,
        chipColorMode: 'birads',
      },
      {
        key: 'remarks',
        label: 'Remarks/Notes',
        type: 'textarea',
        placeholder: 'Enter remarks or notes',
      },
    ],
    defaultValues: {
      breastDensity: '',
      mass: '',
      microlcalcification: '',
      asymmetry: '',
      architecturalDistortion: '',
      size: '',
      dfn: '',
      clockPosition: '',
      associatedAbnormalitySkin: '',
      associatedAbnormalityNipple: '',
      associatedAbnormalityLymphNode: '',
      biRads: '',
      remarks: '',
    },
  },

  // ── Digital Breast Tomosynthesis (same form as MG) ─────────
  // Assigned after object literal (see bottom)

  // ── Contrast Enhanced Mammography (same form as MG) ────────
  // Assigned after object literal (see bottom)

  // ── Breast MRI ─────────────────────────────────────────────
  BR_MR: {
    titlePrefix: 'Lesion',
    fields: [
      {
        key: 'fgt',
        label: 'Amount of FGT',
        type: 'chips',
        options: DENSITY_OPTIONS,
        required: false,
      },
      {
        key: 'bpe',
        label: 'BPE',
        type: 'dropdown',
        options: BPE_OPTIONS,
        placeholder: 'Select BPE',
        required: false,
      },
      {
        key: 'mass',
        label: 'Mass',
        type: 'dropdown',
        options: MASS_OPTIONS,
        placeholder: 'Select',
        required: false,
        halfWidth: true,
      },
      {
        key: 'nme',
        label: 'NME',
        type: 'dropdown',
        options: NME_OPTIONS,
        placeholder: 'Select',
        required: false,
        halfWidth: true,
      },
      SIZE_FIELD,
      DFN_FIELD,
      CLOCK_POSITION_FIELD,
      {
        key: 'associatedAbnormalitySkin',
        label: 'Skin',
        type: 'toggle',
        options: YES_NO_OPTIONS,
        required: false,
        sectionHeader: 'Associated Abnormality',
        small: true,
        halfWidth: true,
      },
      {
        key: 'associatedAbnormalityNipple',
        label: 'Nipple',
        type: 'toggle',
        options: YES_NO_OPTIONS,
        required: false,
        small: true,
        halfWidth: true,
      },
      {
        key: 'associatedAbnormalityLymphNode',
        label: 'Lymph Node',
        type: 'toggle',
        options: YES_NO_OPTIONS,
        required: false,
        small: true,
        halfWidth: true,
      },
      {
        key: 'associatedAbnormalityChestWall',
        label: 'Chest Wall',
        type: 'toggle',
        options: YES_NO_OPTIONS,
        required: false,
        small: true,
        halfWidth: true,
      },
      {
        key: 'biRads',
        label: 'BI-RADS',
        type: 'chips',
        options: BIRADS_OPTIONS,
        required: true,
        chipColorMode: 'birads',
      },
      {
        key: 'remarks',
        label: 'Remarks/Notes',
        type: 'textarea',
        placeholder: 'Enter remarks or notes',
      },
    ],
    defaultValues: {
      fgt: '',
      bpe: '',
      mass: '',
      nme: '',
      size: '',
      dfn: '',
      clockPosition: '',
      associatedAbnormalitySkin: '',
      associatedAbnormalityNipple: '',
      associatedAbnormalityLymphNode: '',
      associatedAbnormalityChestWall: '',
      biRads: '',
      remarks: '',
    },
  },

  // ── Breast Ultrasound ──────────────────────────────────────
  BR_US: {
    titlePrefix: 'Lesion',
    fields: [
      {
        key: 'cyst',
        label: 'Cyst',
        type: 'toggle',
        options: YES_NO_OPTIONS,
        required: false,
      },
      {
        key: 'solid',
        label: 'Solid',
        type: 'dropdown',
        options: SOLID_OPTIONS,
        placeholder: 'Select',
        required: false,
        halfWidth: true,
      },
      {
        key: 'nonMassLesion',
        label: 'Non-Mass Lesion',
        type: 'dropdown',
        options: NON_MASS_LESION_OPTIONS,
        placeholder: 'Select',
        required: false,
        halfWidth: true,
      },
      SIZE_FIELD,
      DFN_FIELD,
      CLOCK_POSITION_FIELD,
      {
        key: 'associatedAbnormalitySkin',
        label: 'Skin',
        type: 'toggle',
        options: YES_NO_OPTIONS,
        required: false,
        sectionHeader: 'Associated Abnormality',
        small: true,
        halfWidth: true,
      },
      {
        key: 'associatedAbnormalityNipple',
        label: 'Nipple',
        type: 'toggle',
        options: YES_NO_OPTIONS,
        required: false,
        small: true,
        halfWidth: true,
      },
      {
        key: 'associatedAbnormalityLymphNode',
        label: 'Lymph Node',
        type: 'toggle',
        options: YES_NO_OPTIONS,
        required: false,
        small: true,
        halfWidth: true,
      },
      {
        key: 'biRads',
        label: 'BI-RADS',
        type: 'chips',
        options: BIRADS_OPTIONS,
        required: true,
        chipColorMode: 'birads',
      },
      {
        key: 'remarks',
        label: 'Remarks/Notes',
        type: 'textarea',
        placeholder: 'Enter remarks or notes',
      },
    ],
    defaultValues: {
      cyst: '',
      solid: '',
      nonMassLesion: '',
      size: '',
      dfn: '',
      clockPosition: '',
      associatedAbnormalitySkin: '',
      associatedAbnormalityNipple: '',
      associatedAbnormalityLymphNode: '',
      biRads: '',
      remarks: '',
    },
  },
};

// DBT and CEM share the same question form as MG
MODALITY_QUESTION_CONFIGS.BR_DBT = { ...MODALITY_QUESTION_CONFIGS.BR_US };
MODALITY_QUESTION_CONFIGS.BR_CEM = { ...MODALITY_QUESTION_CONFIGS.BR_MG };

// ---------- Lookup helper ----------

/**
 * Returns the question form config for a given subspecialty + modality combo.
 * Falls back to BR_MG when no match is found.
 */
export function getQuestionModalConfig(
  subSpecialitySlug: string | null | undefined,
  modalitySlug: string | null | undefined
): QuestionModalityConfig {
  const sub = (subSpecialitySlug ?? 'BR').toUpperCase();
  const mod = (modalitySlug ?? 'MG').toUpperCase();
  const key = `${sub}_${mod}`;
  return MODALITY_QUESTION_CONFIGS[key] ?? MODALITY_QUESTION_CONFIGS['BR_MG'];
}

/**
 * Normalize legacy form data (e.g. 'AbNormal' → 'Abnormal') for backward compatibility.
 * Kept as a pass-through for now; legacy 'definition' field in stored data is ignored
 * since that field was removed from the form UI.
 */
export function normalizeFormData(data: Record<string, unknown>): Record<string, unknown> {
  const normalized = { ...data };
  if (normalized.definition === 'AbNormal') {
    normalized.definition = 'Abnormal';
  }
  return normalized;
}

/**
 * Returns the chip border/bg color for a BI-RADS value.
 * Normal (1, 2) → green, Abnormal (4, 5) → red.
 */
export function getBiradsChipColor(value: string): 'green' | 'red' {
  if (value === '1' || value === '2') {
    return 'green';
  }
  return 'red';
}

/**
 * Validate a number field against min/max bounds.
 * Returns error message or null if valid.
 */
export function validateNumberField(value: string, field: QuestionFieldConfig): string | null {
  if (value === '' || value == null) {
    return field.required ? 'Required' : null;
  }
  const num = Number(value);
  if (Number.isNaN(num)) {
    return 'Must be a number';
  }
  if (field.min != null && num < field.min) {
    return `Min ${field.min}${field.unit ? ' ' + field.unit : ''}`;
  }
  if (field.max != null && num > field.max) {
    return `Max ${field.max}${field.unit ? ' ' + field.unit : ''}`;
  }
  return null;
}
