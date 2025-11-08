// Common types for error handling and API responses

export interface ApiErrorResponse {
  detail?: string;
  error?: string;
  message?: string;
  [key: string]: unknown;
}

export interface ApiError extends Error {
  response?: {
    data?: ApiErrorResponse;
    status?: number;
  };
  message: string;
}

export interface NavigateData {
  id?: string;
  full?: boolean;
  [key: string]: unknown;
}

export interface RegisterFormData {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  location?: string;
}

export interface LoginFormData {
  email: string;
  password: string;
}

export interface ServiceFormData {
  title: string;
  description: string;
  type: 'Offer' | 'Need';
  duration: number;
  location_type: 'In-Person' | 'Online';
  location_area?: string;
  max_participants: number;
  schedule_type: 'One-Time' | 'Recurrent';
  schedule_details?: string;
  tags?: string[];
  tag_names?: string[];
}

export interface RecurringFrequency {
  value: string;
  label: string;
}

// Constants
export const POLLING_INTERVALS = {
  NOTIFICATIONS: 10000, // 10 seconds
  MESSAGES: 3000, // 3 seconds
} as const;

export const ERROR_MESSAGES = {
  NETWORK: 'Network error. Please check your connection.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  NOT_FOUND: 'Resource not found.',
  SERVER_ERROR: 'Server error. Please try again later.',
  UNKNOWN: 'An unexpected error occurred.',
} as const;

/**
 * Extract user-friendly error message from API error
 */
export function getErrorMessage(error: unknown, defaultMessage: string = ERROR_MESSAGES.UNKNOWN): string {
  if (typeof error === 'string') {
    return error;
  }
  
  if (error && typeof error === 'object') {
    const apiError = error as ApiError;
    
    // Check for response.data
    if (apiError.response?.data) {
      const data = apiError.response.data;
      
      // Check for top-level error fields first
      if (data.detail) {
        return typeof data.detail === 'string' ? data.detail : String(data.detail);
      }
      if (data.error) {
        return typeof data.error === 'string' ? data.error : String(data.error);
      }
      if (data.message) {
        return typeof data.message === 'string' ? data.message : String(data.message);
      }
      
      // Handle field-level errors (e.g., {"email": ["user with this email already exists."]})
      const fieldErrors: string[] = [];
      for (const key in data) {
        if (key !== 'detail' && key !== 'error' && key !== 'message') {
          if (Array.isArray(data[key])) {
            const messages = (data[key] as string[]).map(msg => `${key}: ${msg}`);
            fieldErrors.push(...messages);
          } else if (typeof data[key] === 'string') {
            fieldErrors.push(`${key}: ${data[key]}`);
          }
        }
      }
      if (fieldErrors.length > 0) {
        return fieldErrors.join('. ');
      }
    }
    
    // Check for direct message
    if (apiError.message) {
      return apiError.message;
    }
  }
  
  return defaultMessage;
}

/**
 * Check if error is a network error
 */
export function isNetworkError(error: unknown): boolean {
  if (error && typeof error === 'object') {
    const apiError = error as ApiError;
    return !apiError.response || apiError.response.status === 0;
  }
  return false;
}

/**
 * Check if error is an authentication error
 */
export function isAuthError(error: unknown): boolean {
  if (error && typeof error === 'object') {
    const apiError = error as ApiError;
    return apiError.response?.status === 401 || apiError.response?.status === 403;
  }
  return false;
}

