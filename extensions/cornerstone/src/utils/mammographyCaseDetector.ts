/**
 * Simple Mammography Case Type Detector
 *
 * Detects whether a DICOM instance is 2D Mammogram (FFDM) or 3D DBT (Digital Breast Tomosynthesis)
 * Based on the documentation provided by the user.
 */

/**
 * Detect mammography case type from DICOM metadata
 * @param metadata - DICOM metadata object
 * @returns Case type and confidence
 */
export function detectMammographyCaseType(metadata: any): 'FFDM' | 'DBT' {
  // 1. SOP Class UID (Most reliable)
  const sopClassUID = metadata['00080016']?.Value?.[0] || metadata.SOPClassUID;
  const numberOfFrames = metadata['00280008']?.Value?.[0] || metadata.NumberOfFrames;

  if (sopClassUID === '1.2.840.10008.5.1.4.1.1.13.1.3' || numberOfFrames > 1) {
    return 'DBT';
  } else {
    return 'FFDM';
  }
}
// 2. Image Type (Very reliable)

/**
 * Quick check if DBT case
 */
export function isDBTCase(metadata: any): boolean {
  return detectMammographyCaseType(metadata) === 'DBT';
}

/**
 * Quick check if FFDM case
 */
export function isFFDMCase(metadata: any): boolean {
  return detectMammographyCaseType(metadata) === 'FFDM';
}
