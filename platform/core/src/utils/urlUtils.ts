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

  return {
    courseId: searchParams.get('courseId') || undefined,
    moduleId: searchParams.get('moduleId') || undefined,
    facultyId: searchParams.get('facultyId') || undefined,
    studentId: searchParams.get('studentId') || undefined,
    caseId: searchParams.get('caseId') || undefined,
    StudyInstanceUIDs: searchParams.get('StudyInstanceUIDs') || undefined,
    userType: searchParams.get('userType') || 'student',
    isPreview: searchParams.get('isPreview') === 'true',
    viewType: (searchParams.get('viewType') as 'diagnostic' | 'screening') || 'diagnostic',
  };
}

/**
 * Extract custom parameters from a specific URL string
 * Useful for parsing URLs that aren't the current page
 */
export function getCustomParamsFromUrl(url: string): CustomParams {
  try {
    const urlObj = new URL(url);
    const searchParams = new URLSearchParams(urlObj.search);

    return {
      courseId: searchParams.get('courseId') || undefined,
      moduleId: searchParams.get('moduleId') || undefined,
      facultyId: searchParams.get('facultyId') || undefined,
      studentId: searchParams.get('studentId') || undefined,
      StudyInstanceUIDs: searchParams.get('StudyInstanceUIDs') || undefined,
      userType: searchParams.get('userType') || 'student',
      isPreview: searchParams.get('isPreview') === 'true',
      viewType: (searchParams.get('viewType') as 'diagnostic' | 'screening') || 'diagnostic',
    };
  } catch (error) {
    // Invalid URL, return defaults
    return {
      isPreview: false,
      viewType: 'diagnostic',
    };
  }
}
