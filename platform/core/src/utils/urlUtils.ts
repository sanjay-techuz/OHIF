import { decryptObject, decryptUrlParam } from './cryptoUtils';

export interface CustomParams {
  courseId?: string;
  facultyId?: string;
  moduleId?: string;
  caseId?: string;
  studentId?: string;
  userType?: string;
  isPreview: boolean;
  viewType?: 'diagnostic' | 'screening';
  StudyInstanceUIDs?: string;
}

/**
 * Extract custom parameters from current URL
 * First tries to get encrypted 'data' parameter, then falls back to individual parameters
 * Automatically decrypts encrypted parameters while maintaining backward compatibility with plain text
 * Can be used anywhere in the codebase (not just React components)
 */
export function getCustomParams(): CustomParams {
  if (typeof window === 'undefined') {
    // Server-side or non-browser environment
    return {
      isPreview: false,
      viewType: 'diagnostic',
    };
  }

  const searchParams = new URLSearchParams(window.location.search);
  const isPreviewParam = decryptUrlParam(searchParams.get('isPreview'));
  const StudyInstanceUIDs = decryptUrlParam(searchParams.get('StudyInstanceUIDs'));

  // First, try to get encrypted 'data' parameter
  const encryptedData = searchParams.get('data');
  if (encryptedData) {
    const decryptedData = decryptObject(encryptedData);

    if (decryptedData && typeof decryptedData === 'object') {
      // Extract values from decrypted object
      return {
        courseId: decryptedData?.courseId ? `${decryptedData.courseId}` : undefined,
        moduleId: decryptedData?.moduleId ? `${decryptedData.moduleId}` : undefined,
        facultyId: decryptedData?.facultyId ? `${decryptedData.facultyId}` : undefined,
        studentId: decryptedData?.studentId ? `${decryptedData.studentId}` : undefined,
        caseId: decryptedData?.caseId ? `${decryptedData.caseId}` : undefined,
        StudyInstanceUIDs: StudyInstanceUIDs || undefined,
        userType: (decryptedData?.userType as string) || 'student',
        isPreview: isPreviewParam === 'true',
        viewType: (decryptedData?.viewType as 'diagnostic' | 'screening') || 'diagnostic',
      };
    }
  }

  // Fallback: return default values if no data parameter or decryption failed
  return {
    courseId: undefined,
    moduleId: undefined,
    facultyId: undefined,
    studentId: undefined,
    caseId: undefined,
    StudyInstanceUIDs: StudyInstanceUIDs || undefined,
    userType: 'student',
    isPreview: isPreviewParam === 'true',
    viewType: 'diagnostic',
  };
}

/**
 * Extract custom parameters from a specific URL string
 * First tries to get encrypted 'data' parameter, then falls back to individual parameters
 * Automatically decrypts encrypted parameters while maintaining backward compatibility with plain text
 * Useful for parsing URLs that aren't the current page
 */
export function getCustomParamsFromUrl(url: string): CustomParams {
  try {
    const urlObj = new URL(url);
    const searchParams = new URLSearchParams(urlObj.search);
    const isPreviewParam = decryptUrlParam(searchParams.get('isPreview'));
    const StudyInstanceUIDs = decryptUrlParam(searchParams.get('StudyInstanceUIDs'));

    // First, try to get encrypted 'data' parameter
    const encryptedData = searchParams.get('data');
    if (encryptedData) {
      const decryptedData = decryptObject(encryptedData);

      if (decryptedData && typeof decryptedData === 'object') {
        // Extract values from decrypted object
        return {
          courseId: decryptedData?.courseId ? `${decryptedData.courseId}` : undefined,
          moduleId: decryptedData?.moduleId ? `${decryptedData.moduleId}` : undefined,
          facultyId: decryptedData?.facultyId ? `${decryptedData.facultyId}` : undefined,
          studentId: decryptedData?.studentId ? `${decryptedData.studentId}` : undefined,
          caseId: decryptedData?.caseId ? `${decryptedData.caseId}` : undefined,
          StudyInstanceUIDs: StudyInstanceUIDs || undefined,
          userType: (decryptedData.userType as string) || 'student',
          isPreview: isPreviewParam === 'true',
          viewType: (decryptedData.viewType as 'diagnostic' | 'screening') || 'diagnostic',
        };
      }
    }

    // Fallback: return default values if decryption failed
    return {
      courseId: undefined,
      moduleId: undefined,
      facultyId: undefined,
      studentId: undefined,
      caseId: undefined,
      StudyInstanceUIDs: StudyInstanceUIDs || undefined,
      userType: 'student',
      isPreview: isPreviewParam === 'true',
      viewType: 'diagnostic',
    };
  } catch (error) {
    // Invalid URL, return defaults
    return {
      courseId: undefined,
      moduleId: undefined,
      facultyId: undefined,
      studentId: undefined,
      caseId: undefined,
      StudyInstanceUIDs: undefined,
      userType: 'student',
      isPreview: false,
      viewType: 'diagnostic',
    };
  }
}
