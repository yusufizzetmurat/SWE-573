import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { API_TIMEOUT } from './constants';

const API_BASE_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: API_TIMEOUT,
});

// Token refresh state management
let isRefreshing = false;
let refreshPromise: Promise<string> | null = null;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

const processQueue = (error: unknown = null, token: string | null = null) => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else if (token) {
      promise.resolve(token);
    }
  });
  failedQueue = [];
};

// Request interceptor to add JWT token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('access_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh and errors
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // If 401 and we haven't tried to refresh yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // If already refreshing, queue this request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return apiClient(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      isRefreshing = true;

      // Create a single refresh promise that all requests will wait for
      if (!refreshPromise) {
        refreshPromise = (async () => {
          try {
            const refreshToken = localStorage.getItem('refresh_token');
            if (!refreshToken) {
              throw new Error('No refresh token available');
            }

            const response = await axios.post(`${API_BASE_URL}/auth/refresh/`, {
              refresh: refreshToken,
            });

            const { access } = response.data;
            localStorage.setItem('access_token', access);

            processQueue(null, access);
            return access;
          } catch (refreshError: unknown) {
            // Clear tokens and redirect to login on refresh failure
            const refreshApiError = refreshError as { response?: { status?: number } };
            if (
              refreshApiError.response?.status === 401 ||
              refreshApiError.response?.status === 400 ||
              refreshApiError.response?.status === 500
            ) {
              localStorage.removeItem('access_token');
              localStorage.removeItem('refresh_token');
              
              // Redirect to login page
              window.location.href = '/login?error=session_expired';
            }

            processQueue(refreshError, null);
            throw refreshError;
          } finally {
            isRefreshing = false;
            refreshPromise = null;
          }
        })();
      }

      try {
        const newToken = await refreshPromise;
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
        }
        return apiClient(originalRequest);
      } catch (refreshError) {
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;


