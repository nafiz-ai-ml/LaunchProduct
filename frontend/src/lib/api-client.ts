import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { ApiResponse } from '@/types';

const rawUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
export const API_BASE_URL = rawUrl.includes('/api/v1') ? rawUrl : `${rawUrl.replace(/\/$/, '')}/api/v1`;

export class ApiError extends Error {
  statusCode: number;
  code: string;
  details?: any[];

  constructor(message: string, statusCode: number = 500, code: string = 'UNKNOWN_ERROR', details?: any[]) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Request interceptor: Attach Authorization Bearer token from localStorage
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('lp_token');
      if (token && !config.headers.Authorization) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: Extract data and normalize errors
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error: AxiosError<ApiResponse>) => {
    if (error.response) {
      const data = error.response.data;
      const message =
        data?.error?.message ||
        (data as any)?.message ||
        `Request failed with status ${error.response.status}`;
      const code = data?.error?.code || 'API_ERROR';
      const details = data?.error?.details;

      return Promise.reject(new ApiError(message, error.response.status, code, details));
    }

    if (error.request) {
      return Promise.reject(
        new ApiError(
          'No response received from server. Please check your internet connection or server status.',
          0,
          'NETWORK_ERROR'
        )
      );
    }

    return Promise.reject(new ApiError(error.message, 500, 'REQUEST_SETUP_ERROR'));
  }
);

export default apiClient;
