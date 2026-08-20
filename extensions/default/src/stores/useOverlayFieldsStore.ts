import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Persisted user choice of which DICOM-overlay fields to show on every
 * viewport (top-left corner). The catalog defined below is the universe
 * of selectable fields; `selectedFields` is the user's pick (max 3 with
 * FIFO eviction when they add a 4th).
 *
 * The matching value extractors live in
 * `extensions/cornerstone/src/customizations/viewportOverlayCustomization.tsx`
 * so this file stays cleanly decoupled from Cornerstone metadata APIs and
 * can be safely imported by the modal in `platform/ui-next`.
 *
 * Tag set mirrors the standard "Customize DICOM header overlay" menu
 * found in commercial PACS viewers (Siemens syngo.via, GE Centricity,
 * Philips IntelliSpace), grouped by clinical category.
 *
 * @author Sanjay Balai
 */

export type OverlayFieldGroup =
  | 'Common'
  | 'Patient'
  | 'Study'
  | 'Series'
  | 'Equipment'
  | 'Image'
  | 'MR'
  | 'CT / X-Ray'
  | 'Mammography'
  | 'Ultrasound';

export interface OverlayCatalogEntry {
  id: string;
  label: string;
  group: OverlayFieldGroup;
}

export const OVERLAY_FIELD_CATALOG: ReadonlyArray<OverlayCatalogEntry> = [
  // ----- Common (BIEDX defaults at the top) -----
  { id: 'patient_age', label: 'Age', group: 'Common' },
  { id: 'case_id', label: 'Case ID', group: 'Common' },
  { id: 'view', label: 'View (auto-detected)', group: 'Common' },

  // ----- Patient -----
  { id: 'patient_name', label: 'Patient Name', group: 'Patient' },
  { id: 'patient_id', label: 'Patient ID', group: 'Patient' },
  { id: 'patient_sex', label: 'Sex', group: 'Patient' },
  { id: 'patient_birth', label: 'Birth Date', group: 'Patient' },
  { id: 'patient_size', label: 'Patient Size (Height)', group: 'Patient' },
  { id: 'patient_weight', label: 'Patient Weight', group: 'Patient' },
  { id: 'patient_address', label: 'Patient Address', group: 'Patient' },
  { id: 'patient_comments', label: 'Patient Comments', group: 'Patient' },
  { id: 'ethnic_group', label: 'Ethnic Group', group: 'Patient' },
  { id: 'patient_history', label: 'Additional Patient History', group: 'Patient' },
  { id: 'pregnancy_status', label: 'Pregnancy Status', group: 'Patient' },
  { id: 'medical_alerts', label: 'Medical Alerts', group: 'Patient' },
  { id: 'allergies', label: 'Allergies', group: 'Patient' },
  { id: 'occupation', label: 'Occupation', group: 'Patient' },

  // ----- Study -----
  { id: 'study_id', label: 'Study ID', group: 'Study' },
  { id: 'study_date', label: 'Study Date', group: 'Study' },
  { id: 'study_time', label: 'Study Time', group: 'Study' },
  { id: 'study_description', label: 'Study Description', group: 'Study' },
  { id: 'accession', label: 'Accession Number', group: 'Study' },
  { id: 'referring_physician', label: 'Referring Physician', group: 'Study' },
  { id: 'study_comments', label: 'Study Comments', group: 'Study' },
  { id: 'admitting_diagnoses', label: 'Admitting Diagnoses', group: 'Study' },

  // ----- Series -----
  { id: 'series_description', label: 'Series Description', group: 'Series' },
  { id: 'series_number', label: 'Series Number', group: 'Series' },
  { id: 'series_date', label: 'Series Date', group: 'Series' },
  { id: 'series_time', label: 'Series Time', group: 'Series' },
  { id: 'modality', label: 'Modality', group: 'Series' },
  { id: 'body_part', label: 'Body Part Examined', group: 'Series' },
  { id: 'laterality_series', label: 'Laterality (Series)', group: 'Series' },
  { id: 'protocol_name', label: 'Protocol Name', group: 'Series' },
  { id: 'operators_name', label: 'Operators Name', group: 'Series' },
  { id: 'performing_physician', label: 'Performing Physician', group: 'Series' },

  // ----- Equipment -----
  { id: 'institution', label: 'Institution', group: 'Equipment' },
  { id: 'institution_address', label: 'Institution Address', group: 'Equipment' },
  { id: 'institution_dept', label: 'Department Name', group: 'Equipment' },
  { id: 'manufacturer', label: 'Manufacturer', group: 'Equipment' },
  { id: 'manufacturer_model', label: 'Manufacturer Model', group: 'Equipment' },
  { id: 'device_serial', label: 'Device Serial Number', group: 'Equipment' },
  { id: 'station', label: 'Station Name', group: 'Equipment' },
  { id: 'software_versions', label: 'Software Versions', group: 'Equipment' },

  // ----- Image / Instance -----
  { id: 'instance_number', label: 'Instance Number', group: 'Image' },
  { id: 'image_type', label: 'Image Type', group: 'Image' },
  { id: 'image_comments', label: 'Image Comments', group: 'Image' },
  { id: 'acquisition_number', label: 'Acquisition Number', group: 'Image' },
  { id: 'acquisition_date', label: 'Acquisition Date', group: 'Image' },
  { id: 'acquisition_time', label: 'Acquisition Time', group: 'Image' },
  { id: 'acquisition_duration', label: 'Acquisition Duration', group: 'Image' },
  { id: 'content_date', label: 'Content Date', group: 'Image' },
  { id: 'content_time', label: 'Content Time', group: 'Image' },
  { id: 'rows', label: 'Rows', group: 'Image' },
  { id: 'columns', label: 'Columns', group: 'Image' },
  { id: 'pixel_spacing', label: 'Pixel Spacing', group: 'Image' },
  { id: 'imager_pixel_spacing', label: 'Imager Pixel Spacing', group: 'Image' },
  { id: 'slice_thickness', label: 'Slice Thickness', group: 'Image' },
  { id: 'slice_location', label: 'Slice Location', group: 'Image' },
  { id: 'spacing_between_slices', label: 'Spacing Between Slices', group: 'Image' },
  { id: 'image_orientation', label: 'Image Orientation Patient', group: 'Image' },
  { id: 'image_position', label: 'Image Position Patient', group: 'Image' },
  { id: 'photometric', label: 'Photometric Interpretation', group: 'Image' },
  { id: 'bits_allocated', label: 'Bits Allocated', group: 'Image' },
  { id: 'window_center', label: 'Window Center (default)', group: 'Image' },
  { id: 'window_width', label: 'Window Width (default)', group: 'Image' },
  { id: 'rescale_slope', label: 'Rescale Slope', group: 'Image' },
  { id: 'rescale_intercept', label: 'Rescale Intercept', group: 'Image' },
  { id: 'frame_of_reference', label: 'Frame of Reference UID', group: 'Image' },

  // ----- MR-specific -----
  { id: 'echo_time', label: 'Echo Time (TE)', group: 'MR' },
  { id: 'repetition_time', label: 'Repetition Time (TR)', group: 'MR' },
  { id: 'echo_train_length', label: 'Echo Train Length', group: 'MR' },
  { id: 'inversion_time', label: 'Inversion Time (TI)', group: 'MR' },
  { id: 'flip_angle', label: 'Flip Angle', group: 'MR' },
  { id: 'magnetic_field', label: 'Magnetic Field Strength', group: 'MR' },
  { id: 'mr_acquisition_type', label: 'MR Acquisition Type', group: 'MR' },
  { id: 'scanning_sequence', label: 'Scanning Sequence', group: 'MR' },
  { id: 'sequence_variant', label: 'Sequence Variant', group: 'MR' },
  { id: 'scan_options', label: 'Scan Options', group: 'MR' },
  { id: 'num_of_averages', label: 'Number Of Averages', group: 'MR' },
  { id: 'num_phase_encoding', label: 'Number Of Phase Encoding Steps', group: 'MR' },
  { id: 'pixel_bandwidth', label: 'Pixel Bandwidth', group: 'MR' },
  { id: 'imaging_frequency', label: 'Imaging Frequency', group: 'MR' },
  { id: 'in_plane_phase_dir', label: 'In Plane Phase Encoding Direction', group: 'MR' },
  { id: 'diffusion_b_value', label: 'Diffusion B-Value', group: 'MR' },
  { id: 'receive_coil', label: 'Receive Coil Name', group: 'MR' },

  // ----- CT / X-Ray -----
  { id: 'kvp', label: 'KVP', group: 'CT / X-Ray' },
  { id: 'xray_tube_current', label: 'X-Ray Tube Current', group: 'CT / X-Ray' },
  { id: 'exposure_time', label: 'Exposure Time', group: 'CT / X-Ray' },
  { id: 'exposure', label: 'Exposure (mAs)', group: 'CT / X-Ray' },
  { id: 'ctdi_vol', label: 'CTDI Vol', group: 'CT / X-Ray' },
  { id: 'dlp', label: 'DLP', group: 'CT / X-Ray' },
  { id: 'convolution_kernel', label: 'Convolution Kernel', group: 'CT / X-Ray' },
  { id: 'reconstruction_diameter', label: 'Reconstruction Diameter', group: 'CT / X-Ray' },
  { id: 'gantry_tilt', label: 'Gantry/Detector Tilt', group: 'CT / X-Ray' },
  { id: 'filter_type', label: 'Filter Type', group: 'CT / X-Ray' },

  // ----- Mammography -----
  { id: 'laterality', label: 'Image Laterality', group: 'Mammography' },
  { id: 'view_position', label: 'View Position', group: 'Mammography' },
  { id: 'breast_implant', label: 'Breast Implant Present', group: 'Mammography' },
  { id: 'compression_force', label: 'Compression Force', group: 'Mammography' },
  { id: 'body_part_thickness', label: 'Body Part Thickness', group: 'Mammography' },
  { id: 'positioner_angle', label: 'Positioner Primary Angle', group: 'Mammography' },
  { id: 'organ_dose', label: 'Organ Dose', group: 'Mammography' },

  // ----- Ultrasound -----
  { id: 'transducer_type', label: 'Transducer Type', group: 'Ultrasound' },
  { id: 'transducer_freq', label: 'Transducer Frequency', group: 'Ultrasound' },
  { id: 'mechanical_index', label: 'Mechanical Index', group: 'Ultrasound' },
  { id: 'thermal_index', label: 'Thermal Index', group: 'Ultrasound' },
];

export type OverlayFieldId = string;

/** Ordered list of all groups in the order they appear in the modal. */
export const OVERLAY_FIELD_GROUPS: OverlayFieldGroup[] = [
  'Common',
  'Patient',
  'Study',
  'Series',
  'Equipment',
  'Image',
  'MR',
  'CT / X-Ray',
  'Mammography',
  'Ultrasound',
];

export const MAX_OVERLAY_FIELDS = 3;
export const DEFAULT_OVERLAY_FIELDS: OverlayFieldId[] = ['patient_age', 'case_id', 'view'];

interface OverlayFieldsState {
  /** Ordered list of currently visible fields. Order = insertion order (FIFO). */
  selectedFields: OverlayFieldId[];
  /**
   * Global show/hide for the ENTIRE viewport info overlay (the top-left fields
   * AND the corner WW/WL, Zoom and Instance-number readouts). When true the
   * overlay text is hidden on every viewport (orientation markers are kept).
   * Persisted, so the choice sticks across reloads.
   */
  overlayHidden: boolean;
  /**
   * Bumped on every change so subscribers that only care about
   * "something changed" can depend on a single primitive value.
   */
  version: number;
  /** Hide or show the whole info overlay on every viewport. */
  setOverlayHidden: (hidden: boolean) => void;
  /**
   * Toggle a field. Adding a 4th evicts the oldest selection so the
   * count never exceeds MAX_OVERLAY_FIELDS.
   */
  toggleField: (id: OverlayFieldId) => void;
  resetToDefaults: () => void;
  /**
   * Replace the entire selection programmatically. Used when case data
   * arrives with admin-configured `viewer_overlay_fields` for the case's
   * (subspeciality, modality) pair — overrides any prior local pick so
   * what the student sees matches what the admin chose for that combo.
   */
  setSelectedFields: (ids: OverlayFieldId[]) => void;
}

export const useOverlayFieldsStore = create<OverlayFieldsState>()(
  persist(
    (set, get) => ({
      selectedFields: DEFAULT_OVERLAY_FIELDS,
      overlayHidden: false,
      version: 0,
      setOverlayHidden: hidden =>
        set(state => ({ overlayHidden: !!hidden, version: state.version + 1 })),
      toggleField: id =>
        set(state => {
          const current = state.selectedFields;
          const idx = current.indexOf(id);
          let next: OverlayFieldId[];
          if (idx >= 0) {
            next = current.filter(f => f !== id);
          } else {
            next = [...current, id];
            if (next.length > MAX_OVERLAY_FIELDS) {
              // Evict oldest entries until we're at the cap.
              next = next.slice(next.length - MAX_OVERLAY_FIELDS);
            }
          }
          return { selectedFields: next, version: state.version + 1 };
        }),
      resetToDefaults: () =>
        set(state => ({
          selectedFields: [...DEFAULT_OVERLAY_FIELDS],
          version: state.version + 1,
        })),
      setSelectedFields: ids =>
        set(state => {
          // Sanitize: keep only strings, drop dups, cap at MAX, fall back
          // to defaults on empty so the overlay never blanks completely.
          const cleaned = Array.from(new Set((ids || []).filter((x): x is string => typeof x === 'string')));
          const capped = cleaned.length > MAX_OVERLAY_FIELDS ? cleaned.slice(0, MAX_OVERLAY_FIELDS) : cleaned;
          const next = capped.length > 0 ? capped : [...DEFAULT_OVERLAY_FIELDS];
          return { selectedFields: next, version: state.version + 1 };
        }),
    }),
    {
      name: 'biedx-overlay-fields',
      // Persist the user's field pick + the global show/hide choice.
      // `version` is in-memory only.
      partialize: state => ({
        selectedFields: state.selectedFields,
        overlayHidden: state.overlayHidden,
      }),
    }
  )
);
