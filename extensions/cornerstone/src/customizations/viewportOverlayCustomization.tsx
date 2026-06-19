import {
  useOverlayFieldsStore,
  OverlayFieldId,
  getViewLabel,
} from '@ohif/extension-default';

// `getViewLabel` and all its modality-specific helpers (getMammoViewLabel /
// getMRViewLabel / getUSViewLabel / getPlaneFromIOP / matchesImageType) live
// in `@ohif/extension-default/src/utils/getViewLabel.ts` as the single source
// of truth. PanelStudyBrowser also consumes it from there so the sidebar
// cards stay in sync with the per-viewport overlay row.

/**
 * Calculate patient age from PatientBirthDate and StudyDate when PatientAge is not available.
 */
function calculateAge(birthDate: string, studyDate: string): number | null {
  if (!birthDate || !studyDate || birthDate.length < 8 || studyDate.length < 8) {
    return null;
  }

  const birth = new Date(
    parseInt(birthDate.substring(0, 4), 10),
    parseInt(birthDate.substring(4, 6), 10) - 1,
    parseInt(birthDate.substring(6, 8), 10)
  );

  const study = new Date(
    parseInt(studyDate.substring(0, 4), 10),
    parseInt(studyDate.substring(4, 6), 10) - 1,
    parseInt(studyDate.substring(6, 8), 10)
  );

  let age = study.getFullYear() - birth.getFullYear();

  const m = study.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && study.getDate() < birth.getDate())) {
    age--;
  }

  return age >= 0 ? age : null;
}

/**
 * Get patient age from instance metadata.
 * First tries PatientAge tag (00101010), then calculates from PatientBirthDate (00100030)
 * and StudyDate (00080020).
 */
function getPatientAge(instance: any): string | null {
  // Try direct PatientAge tag (DICOM keyword for 00101010)
  const patientAge = instance?.PatientAge;
  if (patientAge) {
    const parsed = parseInt(patientAge, 10);
    return isNaN(parsed) ? patientAge : `${parsed}`;
  }

  // Fallback: calculate from PatientBirthDate and StudyDate
  const birthDate = instance?.PatientBirthDate;
  const studyDate = instance?.StudyDate;
  if (birthDate && studyDate) {
    const age = calculateAge(birthDate, studyDate);
    if (age !== null) {
      return `${age}`;
    }
  }

  return null;
}

/**
 * Map each catalog entry to a value extractor. Anything not in this map
 * is silently skipped — so adding a new catalog entry without an
 * extractor is a no-op rather than a crash.
 *
 * Extractors return `null` whenever the tag is missing/empty so the
 * overlay row disappears (condition() is false) instead of showing a
 * blank label.
 */
const FIELD_EXTRACTORS: Record<
  OverlayFieldId,
  { label: string; title: string; color?: string; getValue: (instance: any) => string | null }
> = {
  // ----- Common (BIEDX defaults) -----
  patient_age: { label: 'Age:', title: 'Patient age', getValue: getPatientAge },
  case_id: {
    label: '',
    title: 'Case ID',
    getValue: () => ((window as any).__currentCaseTitle as string) || null,
  },
  view: {
    label: '',
    title: 'View',
    // Brand-yellow keeps the view marker visually distinct, matching the
    // convention used by Siemens syngo.via and GE Centricity.
    color: '#fbbf24',
    getValue: getViewLabel,
  },

  // ----- Patient -----
  patient_name: { label: 'Name:', title: 'Patient name', getValue: i => formatPersonName(i?.PatientName) },
  patient_id: { label: 'ID:', title: 'Patient ID', getValue: i => stringOrNull(i?.PatientID) },
  patient_sex: { label: 'Sex:', title: 'Patient sex', getValue: i => stringOrNull(i?.PatientSex) },
  patient_birth: { label: 'DOB:', title: 'Patient birth date', getValue: i => formatDicomDate(i?.PatientBirthDate) },
  patient_size: { label: 'Ht:', title: 'Patient size', getValue: i => formatNumberWithUnit(i?.PatientSize, 'm') },
  patient_weight: { label: 'Wt:', title: 'Patient weight', getValue: i => formatNumberWithUnit(i?.PatientWeight, 'kg') },
  patient_address: { label: '', title: 'Patient address', getValue: i => stringOrNull(i?.PatientAddress) },
  patient_comments: { label: '', title: 'Patient comments', getValue: i => stringOrNull(i?.PatientComments) },
  ethnic_group: { label: '', title: 'Ethnic group', getValue: i => stringOrNull(i?.EthnicGroup) },
  patient_history: { label: '', title: 'Additional patient history', getValue: i => stringOrNull(i?.AdditionalPatientHistory) },
  pregnancy_status: { label: '', title: 'Pregnancy status', getValue: i => stringOrNull(i?.PregnancyStatus) },
  medical_alerts: { label: '!', title: 'Medical alerts', getValue: i => stringOrNull(i?.MedicalAlerts) },
  allergies: { label: '!', title: 'Allergies', getValue: i => stringOrNull(i?.Allergies) },
  occupation: { label: '', title: 'Occupation', getValue: i => stringOrNull(i?.Occupation) },

  // ----- Study -----
  study_id: { label: 'Study ID:', title: 'Study ID', getValue: i => stringOrNull(i?.StudyID) },
  study_date: { label: 'Study:', title: 'Study date', getValue: i => formatDicomDate(i?.StudyDate) },
  study_time: { label: '', title: 'Study time', getValue: i => formatDicomTime(i?.StudyTime) },
  study_description: { label: '', title: 'Study description', getValue: i => stringOrNull(i?.StudyDescription) },
  accession: { label: 'Acc:', title: 'Accession number', getValue: i => stringOrNull(i?.AccessionNumber) },
  referring_physician: { label: 'Ref:', title: 'Referring physician', getValue: i => formatPersonName(i?.ReferringPhysicianName) },
  study_comments: { label: '', title: 'Study comments', getValue: i => stringOrNull(i?.StudyComments) },
  admitting_diagnoses: { label: 'Dx:', title: 'Admitting diagnoses', getValue: i => stringOrNull(i?.AdmittingDiagnosesDescription) },

  // ----- Series -----
  series_description: { label: '', title: 'Series description', getValue: i => stringOrNull(i?.SeriesDescription) },
  series_number: { label: 'Series #:', title: 'Series number', getValue: i => stringOrNull(i?.SeriesNumber) },
  series_date: { label: '', title: 'Series date', getValue: i => formatDicomDate(i?.SeriesDate) },
  series_time: { label: '', title: 'Series time', getValue: i => formatDicomTime(i?.SeriesTime) },
  modality: { label: '', title: 'Modality', getValue: i => stringOrNull(i?.Modality) },
  body_part: { label: '', title: 'Body part examined', getValue: i => stringOrNull(i?.BodyPartExamined) },
  laterality_series: { label: '', title: 'Series laterality', getValue: i => stringOrNull(i?.Laterality) },
  protocol_name: { label: '', title: 'Protocol name', getValue: i => stringOrNull(i?.ProtocolName) },
  operators_name: { label: 'Op:', title: 'Operators name', getValue: i => formatPersonName(i?.OperatorsName) },
  performing_physician: { label: 'Phys:', title: 'Performing physician', getValue: i => formatPersonName(i?.PerformingPhysicianName) },

  // ----- Equipment -----
  institution: { label: '', title: 'Institution', getValue: i => stringOrNull(i?.InstitutionName) },
  institution_address: { label: '', title: 'Institution address', getValue: i => stringOrNull(i?.InstitutionAddress) },
  institution_dept: { label: '', title: 'Department name', getValue: i => stringOrNull(i?.InstitutionalDepartmentName) },
  manufacturer: { label: '', title: 'Manufacturer', getValue: i => stringOrNull(i?.Manufacturer) },
  manufacturer_model: { label: '', title: 'Manufacturer model', getValue: i => stringOrNull(i?.ManufacturerModelName) },
  device_serial: { label: 'SN:', title: 'Device serial number', getValue: i => stringOrNull(i?.DeviceSerialNumber) },
  station: { label: '', title: 'Station name', getValue: i => stringOrNull(i?.StationName) },
  software_versions: { label: 'SW:', title: 'Software versions', getValue: i => formatList(i?.SoftwareVersions) },

  // ----- Image / Instance -----
  instance_number: { label: 'I:', title: 'Instance number', getValue: i => stringOrNull(i?.InstanceNumber) },
  image_type: { label: '', title: 'Image type', getValue: i => formatImageType(i?.ImageType) },
  image_comments: { label: '', title: 'Image comments', getValue: i => stringOrNull(i?.ImageComments) },
  acquisition_number: { label: 'Acq #:', title: 'Acquisition number', getValue: i => stringOrNull(i?.AcquisitionNumber) },
  acquisition_date: { label: 'Acq:', title: 'Acquisition date', getValue: i => formatDicomDate(i?.AcquisitionDate) },
  acquisition_time: { label: '', title: 'Acquisition time', getValue: i => formatDicomTime(i?.AcquisitionTime) },
  acquisition_duration: { label: 'Dur:', title: 'Acquisition duration', getValue: i => formatNumberWithUnit(i?.AcquisitionDuration, 's') },
  content_date: { label: '', title: 'Content date', getValue: i => formatDicomDate(i?.ContentDate) },
  content_time: { label: '', title: 'Content time', getValue: i => formatDicomTime(i?.ContentTime) },
  rows: { label: 'R:', title: 'Rows', getValue: i => stringOrNull(i?.Rows) },
  columns: { label: 'C:', title: 'Columns', getValue: i => stringOrNull(i?.Columns) },
  pixel_spacing: { label: 'Pix:', title: 'Pixel spacing', getValue: i => formatPixelSpacing(i?.PixelSpacing) },
  imager_pixel_spacing: { label: 'IPix:', title: 'Imager pixel spacing', getValue: i => formatPixelSpacing(i?.ImagerPixelSpacing) },
  slice_thickness: { label: 'Thk:', title: 'Slice thickness', getValue: i => formatNumberWithUnit(i?.SliceThickness, 'mm') },
  slice_location: { label: 'Loc:', title: 'Slice location', getValue: i => formatNumberWithUnit(i?.SliceLocation, 'mm') },
  spacing_between_slices: { label: 'Sp:', title: 'Spacing between slices', getValue: i => formatNumberWithUnit(i?.SpacingBetweenSlices, 'mm') },
  image_orientation: { label: 'IOP:', title: 'Image orientation patient', getValue: i => formatVector(i?.ImageOrientationPatient) },
  image_position: { label: 'IPP:', title: 'Image position patient', getValue: i => formatVector(i?.ImagePositionPatient) },
  photometric: { label: '', title: 'Photometric interpretation', getValue: i => stringOrNull(i?.PhotometricInterpretation) },
  bits_allocated: { label: 'Bits:', title: 'Bits allocated', getValue: i => stringOrNull(i?.BitsAllocated) },
  window_center: { label: 'WC:', title: 'Window center (default)', getValue: i => formatNumberWithUnit(firstOf(i?.WindowCenter), '') },
  window_width: { label: 'WW:', title: 'Window width (default)', getValue: i => formatNumberWithUnit(firstOf(i?.WindowWidth), '') },
  rescale_slope: { label: 'm:', title: 'Rescale slope', getValue: i => formatNumberWithUnit(i?.RescaleSlope, '') },
  rescale_intercept: { label: 'b:', title: 'Rescale intercept', getValue: i => formatNumberWithUnit(i?.RescaleIntercept, '') },
  frame_of_reference: { label: 'FoR:', title: 'Frame of reference UID', getValue: i => truncateMid(i?.FrameOfReferenceUID, 24) },

  // ----- MR -----
  echo_time: { label: 'TE:', title: 'Echo time', getValue: i => formatNumberWithUnit(i?.EchoTime, 'ms') },
  repetition_time: { label: 'TR:', title: 'Repetition time', getValue: i => formatNumberWithUnit(i?.RepetitionTime, 'ms') },
  echo_train_length: { label: 'ETL:', title: 'Echo train length', getValue: i => stringOrNull(i?.EchoTrainLength) },
  inversion_time: { label: 'TI:', title: 'Inversion time', getValue: i => formatNumberWithUnit(i?.InversionTime, 'ms') },
  flip_angle: { label: 'FA:', title: 'Flip angle', getValue: i => formatNumberWithUnit(i?.FlipAngle, '°') },
  magnetic_field: { label: 'B0:', title: 'Magnetic field strength', getValue: i => formatNumberWithUnit(i?.MagneticFieldStrength, 'T') },
  mr_acquisition_type: { label: '', title: 'MR acquisition type', getValue: i => stringOrNull(i?.MRAcquisitionType) },
  scanning_sequence: { label: 'Seq:', title: 'Scanning sequence', getValue: i => formatList(i?.ScanningSequence) },
  sequence_variant: { label: 'Var:', title: 'Sequence variant', getValue: i => formatList(i?.SequenceVariant) },
  scan_options: { label: 'Opt:', title: 'Scan options', getValue: i => formatList(i?.ScanOptions) },
  num_of_averages: { label: 'NEX:', title: 'Number of averages', getValue: i => formatNumberWithUnit(i?.NumberOfAverages, '') },
  num_phase_encoding: { label: 'NPE:', title: 'Number of phase encoding steps', getValue: i => formatNumberWithUnit(i?.NumberOfPhaseEncodingSteps, '') },
  pixel_bandwidth: { label: 'BW:', title: 'Pixel bandwidth', getValue: i => formatNumberWithUnit(i?.PixelBandwidth, 'Hz/px') },
  imaging_frequency: { label: 'Freq:', title: 'Imaging frequency', getValue: i => formatNumberWithUnit(i?.ImagingFrequency, 'MHz') },
  in_plane_phase_dir: { label: 'PE:', title: 'In plane phase encoding direction', getValue: i => stringOrNull(i?.InPlanePhaseEncodingDirection) },
  diffusion_b_value: { label: 'b:', title: 'Diffusion b-value', getValue: i => formatNumberWithUnit(i?.DiffusionBValue, 's/mm²') },
  receive_coil: { label: 'Coil:', title: 'Receive coil name', getValue: i => stringOrNull(i?.ReceiveCoilName) },

  // ----- CT / X-Ray -----
  kvp: { label: 'kVp:', title: 'KVP', getValue: i => formatNumberWithUnit(i?.KVP, '') },
  xray_tube_current: { label: 'mA:', title: 'X-ray tube current', getValue: i => formatNumberWithUnit(i?.XRayTubeCurrent, 'mA') },
  exposure_time: { label: 'ms:', title: 'Exposure time', getValue: i => formatNumberWithUnit(i?.ExposureTime, 'ms') },
  exposure: { label: 'mAs:', title: 'Exposure', getValue: i => formatNumberWithUnit(i?.Exposure, 'mAs') },
  ctdi_vol: { label: 'CTDI:', title: 'CTDI vol', getValue: i => formatNumberWithUnit(i?.CTDIvol, 'mGy') },
  dlp: { label: 'DLP:', title: 'Dose length product', getValue: i => formatNumberWithUnit(i?.DLP || i?.DoseLengthProduct, 'mGy·cm') },
  convolution_kernel: { label: 'Krn:', title: 'Convolution kernel', getValue: i => stringOrNull(i?.ConvolutionKernel) },
  reconstruction_diameter: { label: 'FOV:', title: 'Reconstruction diameter', getValue: i => formatNumberWithUnit(i?.ReconstructionDiameter, 'mm') },
  gantry_tilt: { label: 'Tilt:', title: 'Gantry/detector tilt', getValue: i => formatNumberWithUnit(i?.GantryDetectorTilt, '°') },
  filter_type: { label: 'Flt:', title: 'Filter type', getValue: i => stringOrNull(i?.FilterType) },

  // ----- Mammography -----
  laterality: { label: '', title: 'Image laterality', getValue: i => stringOrNull(i?.ImageLaterality) },
  view_position: { label: '', title: 'View position', getValue: i => stringOrNull(i?.ViewPosition) },
  breast_implant: { label: 'Implant:', title: 'Breast implant present', getValue: i => stringOrNull(i?.BreastImplantPresent) },
  compression_force: { label: 'Force:', title: 'Compression force', getValue: i => formatNumberWithUnit(i?.CompressionForce, 'N') },
  body_part_thickness: { label: 'BPT:', title: 'Body part thickness', getValue: i => formatNumberWithUnit(i?.BodyPartThickness, 'mm') },
  positioner_angle: { label: 'Ang:', title: 'Positioner primary angle', getValue: i => formatNumberWithUnit(i?.PositionerPrimaryAngle, '°') },
  organ_dose: { label: 'Dose:', title: 'Organ dose', getValue: i => formatNumberWithUnit(i?.OrganDose, 'mGy') },

  // ----- Ultrasound -----
  transducer_type: { label: 'Probe:', title: 'Transducer type', getValue: i => stringOrNull(i?.TransducerType) },
  transducer_freq: { label: 'Freq:', title: 'Transducer frequency', getValue: i => formatNumberWithUnit(i?.TransducerFrequency, 'MHz') },
  mechanical_index: { label: 'MI:', title: 'Mechanical index', getValue: i => formatNumberWithUnit(i?.MechanicalIndex, '') },
  thermal_index: { label: 'TI:', title: 'Thermal index', getValue: i => formatNumberWithUnit(i?.ThermalIndex, '') },
};

function stringOrNull(v: any): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s ? s : null;
}

function formatPersonName(v: any): string | null {
  if (!v) return null;
  if (typeof v === 'string') return v.replace(/\^/g, ' ').trim() || null;
  // OHIF normalised PN object: { Alphabetic: 'Doe^John' }
  const alpha = v?.Alphabetic || v?.alphabetic;
  return alpha ? String(alpha).replace(/\^/g, ' ').trim() : null;
}

function formatDicomDate(v: any): string | null {
  if (!v || typeof v !== 'string' || v.length < 8) return null;
  return `${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)}`;
}

function formatDicomTime(v: any): string | null {
  if (!v || typeof v !== 'string' || v.length < 4) return null;
  return `${v.slice(0, 2)}:${v.slice(2, 4)}${v.length >= 6 ? ':' + v.slice(4, 6) : ''}`;
}

function formatNumberWithUnit(v: any, unit: string): string | null {
  if (v === null || v === undefined || v === '') return null;
  const n = parseFloat(v);
  if (isNaN(n)) return null;
  const formatted = n % 1 === 0 ? n.toFixed(0) : n.toFixed(2);
  return unit ? `${formatted} ${unit}` : formatted;
}

function formatPixelSpacing(v: any): string | null {
  if (!v) return null;
  let arr: number[];
  if (typeof v === 'string') arr = v.split('\\').map(Number);
  else if (Array.isArray(v)) arr = v.map(Number);
  else return null;
  if (arr.length < 2 || arr.some(isNaN)) return null;
  return `${arr[0].toFixed(2)}×${arr[1].toFixed(2)} mm`;
}

function formatImageType(v: any): string | null {
  if (!v) return null;
  const flat = Array.isArray(v) ? v.join('\\') : String(v);
  const trimmed = flat.trim();
  return trimmed && trimmed.length <= 40 ? trimmed : null;
}

/** Render an arbitrary list-valued tag (string or array) as a compact "A, B, C" string. */
function formatList(v: any): string | null {
  if (!v) return null;
  const arr = Array.isArray(v) ? v : String(v).split('\\');
  const joined = arr.map(s => String(s).trim()).filter(Boolean).join(', ');
  return joined || null;
}

/** Compact [x, y, z] / [r1, r2, r3, c1, c2, c3] formatter for IOP / IPP. */
function formatVector(v: any): string | null {
  if (!v) return null;
  let arr: number[];
  if (typeof v === 'string') arr = v.split('\\').map(Number);
  else if (Array.isArray(v)) arr = v.map(Number);
  else return null;
  if (arr.length === 0 || arr.some(isNaN)) return null;
  return arr.map(n => n.toFixed(2)).join(', ');
}

/** Many DICOM number tags can be VR=DS multi-valued. Return the first numeric. */
function firstOf(v: any): number | string | null {
  if (v === null || v === undefined) return null;
  if (Array.isArray(v)) return v.length ? v[0] : null;
  if (typeof v === 'string' && v.includes('\\')) return v.split('\\')[0];
  return v;
}

/** Long UIDs are unreadable; show "first…last" beyond `n` chars. */
function truncateMid(v: any, n: number): string | null {
  const s = stringOrNull(v);
  if (!s) return null;
  if (s.length <= n) return s;
  const keep = Math.max(4, Math.floor((n - 1) / 2));
  return `${s.slice(0, keep)}…${s.slice(-keep)}`;
}

/**
 * Build the topLeft overlay items dynamically — one per catalog entry.
 *
 * Each item's `condition` returns true only when (a) the user has the
 * field selected in `useOverlayFieldsStore` AND (b) the extractor
 * produces a non-empty value. `condition`/`contentF` are called on every
 * overlay render and read fresh store state via `getState()`, so a field
 * toggle takes effect on the next render — the hidden version
 * subscription in `CustomizableViewportOverlay.tsx` is what schedules
 * that render.
 *
 * Render order is catalog order, not selection order. That's intentional:
 * the visible stack stays in a stable position regardless of which order
 * the user picked fields in.
 */
const topLeftItems = (Object.keys(FIELD_EXTRACTORS) as OverlayFieldId[]).map(id => {
  const ext = FIELD_EXTRACTORS[id];
  return {
    id: `OverlayField:${id}`,
    inheritsFrom: 'ohif.overlayItem',
    label: ext.label,
    title: ext.title,
    color: ext.color,
    condition: ({ referenceInstance }) => {
      const selected = useOverlayFieldsStore.getState().selectedFields;
      if (!selected.includes(id)) return false;
      try {
        return !!ext.getValue(referenceInstance);
      } catch {
        return false;
      }
    },
    contentF: ({ referenceInstance }) => {
      try {
        return ext.getValue(referenceInstance);
      } catch {
        return null;
      }
    },
  };
});

export default {
  'viewportOverlay.topLeft': topLeftItems,
  'viewportOverlay.topRight': [],
  'viewportOverlay.bottomLeft': [
    {
      id: 'WindowLevel',
      inheritsFrom: 'ohif.overlayItem.windowLevel',
    },
    {
      id: 'ZoomLevel',
      inheritsFrom: 'ohif.overlayItem.zoomLevel',
    },
  ],
  'viewportOverlay.bottomRight': [
    {
      id: 'InstanceNumber',
      inheritsFrom: 'ohif.overlayItem.instanceNumber',
    },
  ],
};
