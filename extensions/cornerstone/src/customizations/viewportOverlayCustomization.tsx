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

export default {
  'viewportOverlay.topLeft': [
    {
      id: 'PatientAge',
      inheritsFrom: 'ohif.overlayItem',
      label: 'Age:',
      title: 'Patient age',
      condition: ({ referenceInstance }) => {
        return !!getPatientAge(referenceInstance);
      },
      contentF: ({ referenceInstance }) => getPatientAge(referenceInstance),
    },
    {
      id: 'CaseTitle',
      inheritsFrom: 'ohif.overlayItem',
      label: '',
      title: 'Case ID',
      condition: () => !!(window as any).__currentCaseTitle,
      contentF: () => (window as any).__currentCaseTitle,
    },
  ],
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
