import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { showUnauthorizedModal } from '../../utils/showUnauthorizedModal';

export interface ApiResponse<T = unknown> {
  data: T;
  status: number;
  statusText: string;
  message?: string;
}

export interface ApiError {
  message: string;
  status?: number;
  data?: unknown;
}

export class ApiService {
  private axiosInstance: AxiosInstance;
  private baseURL: string;

  constructor(baseURL?: string) {
    // Get base URL from environment variables or constructor parameter
    this.baseURL = baseURL || this.getBaseURLFromEnv();
    this.axiosInstance = axios.create({
      baseURL: this.baseURL,
      timeout: 30000, // 30 seconds
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor
    this.axiosInstance.interceptors.request.use(
      config => {
        // Add auth token if available
        const token = this.getAuthToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      error => {
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.axiosInstance.interceptors.response.use(
      (response: AxiosResponse) => {
        return response;
      },
      error => {
        console.log('error', error);
        if (error.response?.status === 401) {
          this.clearAuthToken();
          showUnauthorizedModal();
        }
        const apiError: ApiError = {
          message: error.response?.data?.message || error.message || 'An error occurred',
          status: error.response?.status,
          data: error.response?.data,
        };
        return Promise.reject(apiError);
      }
    );
  }

  /**
   * Get base URL from environment variables
   */
  private getBaseURLFromEnv(): string {
    // Check for environment variables in order of priority
    if (typeof process !== 'undefined' && process.env) {
      // Node.js environment
      return process.env.API_BASE_URL || 'http://20.198.254.147/api';
    }

    // Fallback to empty string
    return 'http://20.198.254.147/api';
  }

  /**
   * Get authentication token from localStorage or other source
   */
  private getAuthToken(): string | null {
    // You can customize this based on your auth implementation
    return localStorage.getItem('authToken') || null;
  }

  /**
   * Set base URL for the API service
   */
  setBaseURL(url: string): void {
    this.baseURL = url;
    this.axiosInstance.defaults.baseURL = url;
  }

  /**
   * Set default headers
   */
  setDefaultHeaders(headers: Record<string, string>): void {
    this.axiosInstance.defaults.headers.common = {
      ...this.axiosInstance.defaults.headers.common,
      ...headers,
    };
  }

  /**
   * Set authentication token
   */
  setAuthToken(token: string): void {
    localStorage.setItem('authToken', token);
  }

  /**
   * Clear authentication token
   */
  clearAuthToken(): void {
    localStorage.removeItem('authToken');
  }

  /**
   * GET request
   */
  async get<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.axiosInstance.get<T>(url, config);
    return {
      data: response.data,
      status: response.status,
      statusText: response.statusText,
    };
  }

  /**
   * POST request
   */
  async post<T = unknown>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    const response = await this.axiosInstance.post<T>(url, data, config);
    return {
      data: response.data,
      status: response.status,
      statusText: response.statusText,
    };
  }

  /**
   * PUT request
   */
  async put<T = unknown>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    const response = await this.axiosInstance.put<T>(url, data, config);
    return {
      data: response.data,
      status: response.status,
      statusText: response.statusText,
    };
  }

  /**
   * PATCH request
   */
  async patch<T = unknown>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    const response = await this.axiosInstance.patch<T>(url, data, config);
    return {
      data: response.data,
      status: response.status,
      statusText: response.statusText,
    };
  }

  /**
   * DELETE request
   */
  async delete<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.axiosInstance.delete<T>(url, config);
    return {
      data: response.data,
      status: response.status,
      statusText: response.statusText,
    };
  }

  /**
   * Upload file with FormData
   */
  async upload<T = unknown>(
    url: string,
    formData: FormData,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    const uploadConfig: AxiosRequestConfig = {
      ...config,
      headers: {
        ...config?.headers,
        'Content-Type': 'multipart/form-data',
      },
    };

    const response = await this.axiosInstance.post<T>(url, formData, uploadConfig);
    return {
      data: response.data,
      status: response.status,
      statusText: response.statusText,
    };
  }

  /**
   * Download file
   */
  async download(url: string, filename?: string, config?: AxiosRequestConfig): Promise<void> {
    const response = await this.axiosInstance.get(url, {
      ...config,
      responseType: 'blob',
    });

    const blob = new Blob([response.data]);
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename || 'download';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  }

  /**
   * Create a new instance with different base URL
   */
  createInstance(baseURL: string): ApiService {
    return new ApiService(baseURL);
  }
}

// Create default instance
export const apiService = new ApiService();

// Export types for use in other files
export type { AxiosRequestConfig, AxiosResponse };
