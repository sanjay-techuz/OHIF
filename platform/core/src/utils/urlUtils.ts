import { apiService } from '../services/ApiService';
import { decryptObject, decryptUrlParam } from './cryptoUtils';
import { getTokenPayloadCache } from './viewerTokenResolver';

function buildParamsFromPayload(
  payload: Record<string, unknown>,
  StudyInstanceUIDs: string | null,
  isPreviewParam: string | null,
  searchParams?: URLSearchParams
): CustomParams {
  // Allow per-navigation URL overrides for fields that change as the user
  // moves between cases inside OHIF (Results → preview, viewer prev/next).
  // Auth (token, IDs, courseId, ...) stays in the cached token payload; only
  // the differing identifiers come through plain URL params — no need to
  // re-encrypt anything during in-app navigation.
  const urlCaseId = searchParams?.get('caseId') || undefined;
  const urlViewTypeRaw = searchParams?.get('viewType') || undefined;
  const urlViewType =
    urlViewTypeRaw === 'diagnostic' || urlViewTypeRaw === 'screening'
      ? (urlViewTypeRaw as 'diagnostic' | 'screening')
      : undefined;

  apiService.setAuthToken(payload?.token as string);
  return {
    courseId: payload?.courseId ? `${payload.courseId}` : undefined,
    moduleId: payload?.moduleId ? `${payload.moduleId}` : undefined,
    facultyId: payload?.facultyId ? `${payload.facultyId}` : undefined,
    studentId: payload?.studentId ? `${payload.studentId}` : undefined,
    caseId: urlCaseId || (payload?.caseId ? `${payload.caseId}` : undefined),
    StudyInstanceUIDs: StudyInstanceUIDs || undefined,
    userType: (payload?.userType as string) || 'student',
    isPreview:
      isPreviewParam === 'true' || payload?.isPreview === true || payload?.isPreview === 'true',
    viewType: urlViewType || (payload?.viewType as 'diagnostic' | 'screening') || 'diagnostic',
    token: payload?.token ? `${payload.token}` : undefined,
    isFellowship: payload?.isFellowship === true || payload?.isFellowship === 'true',
    programId: payload?.programId ? `${payload.programId}` : undefined,
    phaseId: payload?.phaseId ? `${payload.phaseId}` : undefined,
  };
}

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
  token?: string;
  // Fellowship context — populated when the encrypted URL has
  // `isFellowship: true`. Sent to backend to route reads/writes to the
  // fellowship tables instead of the flat-course ones.
  isFellowship?: boolean;
  programId?: string;
  phaseId?: string;
}

/**
 * Build the fellowship context payload to add to a POST body for the
 * student-side cases endpoints. Returns an empty object for flat courses
 * so that existing call sites that spread the result stay backwards
 * compatible. Use `moduleId` from `useCustomParams()` as the fellowship
 * curriculum module identifier (biedx-react puts that in `moduleId`
 * when isFellowship=true).
 */
export function buildFellowshipBody(
  params: Pick<CustomParams, 'isFellowship' | 'programId' | 'phaseId' | 'moduleId'>
): Record<string, unknown> {
  if (!params.isFellowship) {
    return {};
  }
  return {
    is_fellowship: true,
    fellowship_program_id: params.programId,
    phase_id: params.phaseId,
    fellowship_curriculum_module_id: params.moduleId,
  };
}

/**
 * Build the fellowship query-string suffix (including the leading `?` if
 * the URL has no query yet, `&` otherwise) for a GET endpoint. Returns
 * an empty string for flat courses.
 */
export function buildFellowshipQuery(
  params: Pick<CustomParams, 'isFellowship' | 'programId' | 'phaseId' | 'moduleId'>,
  urlAlreadyHasQuery = false
): string {
  if (!params.isFellowship) {
    return '';
  }
  const qs = new URLSearchParams();
  qs.set('is_fellowship', 'true');
  if (params.programId) {
    qs.set('fellowship_program_id', params.programId);
  }
  if (params.phaseId) {
    qs.set('phase_id', params.phaseId);
  }
  if (params.moduleId) {
    qs.set('fellowship_curriculum_module_id', params.moduleId);
  }
  return (urlAlreadyHasQuery ? '&' : '?') + qs.toString();
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

  // Preferred path: token-resolver populated the cache from `?t=...`
  const tokenPayload = getTokenPayloadCache();
  if (tokenPayload) {
    return buildParamsFromPayload(tokenPayload, StudyInstanceUIDs, isPreviewParam, searchParams);
  }

  // Backward-compat path: encrypted 'data' parameter
  const encryptedData = searchParams.get('data');
  if (encryptedData) {
    const decryptedData = decryptObject(encryptedData);

    if (decryptedData && typeof decryptedData === 'object') {
      return buildParamsFromPayload(
        decryptedData as Record<string, unknown>,
        StudyInstanceUIDs,
        isPreviewParam,
        searchParams
      );
    }
  }

  apiService.setAuthToken(null);
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
    token: undefined,
    isFellowship: false,
    programId: undefined,
    phaseId: undefined,
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

    // Preferred path: token-resolver cache (populated when ?t=... was redeemed)
    const tokenPayload = getTokenPayloadCache();
    if (tokenPayload) {
      return buildParamsFromPayload(tokenPayload, StudyInstanceUIDs, isPreviewParam, searchParams);
    }

    // Backward-compat path: encrypted 'data' parameter
    const encryptedData = searchParams.get('data');
    if (encryptedData) {
      const decryptedData = decryptObject(encryptedData);

      if (decryptedData && typeof decryptedData === 'object') {
        return buildParamsFromPayload(
          decryptedData as Record<string, unknown>,
          StudyInstanceUIDs,
          isPreviewParam,
          searchParams
        );
      }
    }

    apiService.setAuthToken(null);
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
      token: undefined,
      isFellowship: false,
      programId: undefined,
      phaseId: undefined,
    };
  } catch (error) {
    // Invalid URL, return defaults
    apiService.setAuthToken(null);
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
      token: undefined,
      isFellowship: false,
      programId: undefined,
      phaseId: undefined,
    };
  }
}
