import { ApiError, ApiResponse } from '../services/ApiService/ApiService';

/**
 * Standard HTTP status codes for API responses
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
} as const;

/**
 * Type for successful HTTP status codes
 */
export type SuccessStatus =
  | typeof HTTP_STATUS.OK
  | typeof HTTP_STATUS.CREATED
  | typeof HTTP_STATUS.NO_CONTENT;

/**
 * Type for error HTTP status codes
 */
export type ErrorStatus =
  | typeof HTTP_STATUS.BAD_REQUEST
  | typeof HTTP_STATUS.UNAUTHORIZED
  | typeof HTTP_STATUS.FORBIDDEN
  | typeof HTTP_STATUS.NOT_FOUND
  | typeof HTTP_STATUS.CONFLICT
  | typeof HTTP_STATUS.UNPROCESSABLE_ENTITY
  | typeof HTTP_STATUS.INTERNAL_SERVER_ERROR
  | typeof HTTP_STATUS.BAD_GATEWAY
  | typeof HTTP_STATUS.SERVICE_UNAVAILABLE;

/**
 * Check if a status code indicates success
 */
export const isSuccessStatus = (status: number): status is SuccessStatus => {
  return status >= 200 && status < 300;
};

/**
 * Check if a status code indicates an error
 */
export const isErrorStatus = (status: number): status is ErrorStatus => {
  return status >= 400;
};

/**
 * Standardized API response handler
 * Handles success and error responses with proper typing
 */
export const handleApiResponse = <T = unknown>(
  response: ApiResponse<T>
):
  | { success: true; data: T; status: number }
  | { success: false; error: ApiError; status: number } => {
  if (isSuccessStatus(response.status)) {
    return {
      success: true,
      data: response.data,
      status: response.status,
    };
  }

  return {
    success: false,
    error: {
      message: response.message || 'An error occurred',
      status: response.status,
      data: response.data,
    },
    status: response.status,
  };
};

/**
 * Wrapper for API calls with standardized error handling
 * Returns a promise that resolves to either success or error result
 */
export const apiCall = async <T = unknown>(
  apiFunction: () => Promise<ApiResponse<T>>
): Promise<
  { success: true; data: T; status: number } | { success: false; error: ApiError; status: number }
> => {
  try {
    const response = await apiFunction();
    return handleApiResponse(response);
  } catch (error) {
    const apiError = error as ApiError;
    return {
      success: false,
      error: apiError,
      status: apiError.status || 500,
    };
  }
};

/**
 * Type definitions for common API response structures
 */
export interface StandardApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  status: number;
}

export interface PaginatedResponse<T = unknown> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ErrorResponse {
  success: false;
  message: string;
  status: number;
  errors?: Record<string, string[]>;
}
