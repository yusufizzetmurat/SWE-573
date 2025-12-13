// Common types for error handling and API responses

export interface ApiErrorResponse {
  detail: string;
  code: string;
  field_errors?: Record<string, string[]>;
  // Legacy support for old error format
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

// Standard error codes from backend
export const ErrorCodes = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
  INVALID_STATE: 'INVALID_STATE',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  NOT_FOUND: 'NOT_FOUND',
  AUTHENTICATION_FAILED: 'AUTHENTICATION_FAILED',
  CONFLICT: 'CONFLICT',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  UNAUTHORIZED: 'UNAUTHORIZED',
  INVALID_INPUT: 'INVALID_INPUT',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  SERVER_ERROR: 'SERVER_ERROR',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

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
      const detail = data.detail ? (typeof data.detail === 'string' ? data.detail : String(data.detail)) : '';
      
      // New standardized format: { detail, code, field_errors? }
      if (data.detail && data.code) {
        // If there are field errors, format them nicely
        if (data.field_errors && Object.keys(data.field_errors).length > 0) {
          const fieldMessages = Object.entries(data.field_errors)
            .map(([field, errors]) => `${field}: ${errors.join(', ')}`)
            .join('. ');
          return `${data.detail} ${fieldMessages}`;
        }
        return data.detail;
      }

      // Collect field-level errors (e.g., {"email": ["user with this email already exists."]})
      const fieldErrors: string[] = [];

      if (data.field_errors && typeof data.field_errors === 'object') {
        for (const [field, errors] of Object.entries(data.field_errors)) {
          if (Array.isArray(errors)) {
            fieldErrors.push(`${field}: ${errors.join(', ')}`);
          }
        }
      }

      for (const key in data) {
        if (key !== 'detail' && key !== 'error' && key !== 'message' && key !== 'code' && key !== 'field_errors') {
          if (Array.isArray(data[key])) {
            const messages = (data[key] as unknown[])
              .filter((v): v is string => typeof v === 'string')
              .map((msg) => `${key}: ${msg}`);
            fieldErrors.push(...messages);
          } else if (typeof data[key] === 'string') {
            fieldErrors.push(`${key}: ${data[key]}`);
          }
        }
      }

      if (detail && fieldErrors.length > 0) {
        return `${detail} ${fieldErrors.join('. ')}`;
      }

      // Legacy support: Check for old error format
      if (detail) {
        return detail;
      }
      if (data.error) {
        return typeof data.error === 'string' ? data.error : String(data.error);
      }
      if (data.message) {
        return typeof data.message === 'string' ? data.message : String(data.message);
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
 * Extract error code from API error
 */
export function getErrorCode(error: unknown): ErrorCode | null {
  if (error && typeof error === 'object') {
    const apiError = error as ApiError;
    if (apiError.response?.data?.code) {
      return apiError.response.data.code as ErrorCode;
    }
  }
  return null;
}

/**
 * Get formatted error message with code for debugging
 * Useful for development or detailed error logging
 */
export function getDetailedErrorMessage(error: unknown, defaultMessage: string = ERROR_MESSAGES.UNKNOWN): string {
  const message = getErrorMessage(error, defaultMessage);
  const code = getErrorCode(error);
  
  if (code && import.meta.env.DEV) {
    return `${message} (Code: ${code})`;
  }
  
  return message;
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

// Forum Types
export type ForumCategoryColor = 'blue' | 'green' | 'purple' | 'amber' | 'orange' | 'pink' | 'red' | 'teal';

export interface ForumCategory {
  id: string;
  name: string;
  description: string;
  slug: string;
  icon: string;
  color: ForumCategoryColor;
  display_order: number;
  is_active: boolean;
  topic_count: number;
  post_count: number;
  last_activity: string | null;
  created_at: string;
  updated_at: string;
}

export interface ForumTopic {
  id: string;
  category: string;
  category_name: string;
  category_slug: string;
  author_id: string;
  author_name: string;
  author_avatar_url: string | null;
  title: string;
  body: string;
  is_pinned: boolean;
  is_locked: boolean;
  view_count: number;
  reply_count: number;
  last_activity: string;
  created_at: string;
  updated_at: string;
  posts?: ForumPost[];
}

export interface ForumPost {
  id: string;
  topic: string;
  author_id: string;
  author_name: string;
  author_avatar_url: string | null;
  body: string;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface ForumRecentPost extends ForumPost {
  topic_title: string;
  category_slug: string;
  category_name: string;
}

export interface CreateForumTopicData {
  category: string;
  title: string;
  body: string;
}

export interface CreateForumPostData {
  body: string;
}

export interface CreateForumCategoryData {
  name: string;
  description: string;
  slug: string;
  icon: string;
  color: ForumCategoryColor;
  display_order: number;
}

