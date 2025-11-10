/**
 * Form validation utilities
 */

export interface ValidationRule {
  validate: (value: any) => boolean;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

/**
 * Common validation rules
 */
export const validationRules = {
  required: (fieldName: string): ValidationRule => ({
    validate: (value) => value !== null && value !== undefined && value !== '',
    message: `${fieldName} is required`,
  }),

  minLength: (min: number, fieldName: string): ValidationRule => ({
    validate: (value) => !value || value.length >= min,
    message: `${fieldName} must be at least ${min} characters`,
  }),

  maxLength: (max: number, fieldName: string): ValidationRule => ({
    validate: (value) => !value || value.length <= max,
    message: `${fieldName} must be ${max} characters or less`,
  }),

  min: (min: number, fieldName: string): ValidationRule => ({
    validate: (value) => !value || Number(value) >= min,
    message: `${fieldName} must be at least ${min}`,
  }),

  max: (max: number, fieldName: string): ValidationRule => ({
    validate: (value) => !value || Number(value) <= max,
    message: `${fieldName} must be ${max} or less`,
  }),

  positive: (fieldName: string): ValidationRule => ({
    validate: (value) => value === null || value === undefined || value === '' || Number(value) > 0,
    message: `${fieldName} must be greater than 0`,
  }),

  url: (fieldName: string): ValidationRule => ({
    validate: (value) => {
      if (!value) return true;
      try {
        new URL(value);
        return value.startsWith('http://') || value.startsWith('https://');
      } catch {
        return false;
      }
    },
    message: `${fieldName} must be a valid HTTP/HTTPS URL`,
  }),

  email: (fieldName: string): ValidationRule => ({
    validate: (value) => {
      if (!value) return true;
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(value);
    },
    message: `${fieldName} must be a valid email address`,
  }),
};

/**
 * Service creation form validation schema
 */
export const serviceValidationSchema = {
  title: [
    validationRules.required('Title'),
    validationRules.minLength(3, 'Title'),
    validationRules.maxLength(200, 'Title'),
  ],
  description: [
    validationRules.required('Description'),
    validationRules.minLength(10, 'Description'),
    validationRules.maxLength(5000, 'Description'),
  ],
  type: [validationRules.required('Type')],
  duration: [
    validationRules.required('Duration'),
    validationRules.positive('Duration'),
  ],
  location_type: [validationRules.required('Location type')],
  location_area: [
    {
      validate: (value, formData: any) => {
        // Location area is required for in-person services
        if (formData?.location_type === 'In-Person') {
          return value !== null && value !== undefined && value !== '';
        }
        return true;
      },
      message: 'Location area is required for in-person services',
    },
  ],
  max_participants: [
    validationRules.required('Max participants'),
    validationRules.positive('Max participants'),
  ],
  schedule_type: [validationRules.required('Schedule type')],
};

/**
 * Profile edit form validation schema
 */
export const profileValidationSchema = {
  first_name: [
    validationRules.required('First name'),
    validationRules.maxLength(150, 'First name'),
  ],
  last_name: [
    validationRules.required('Last name'),
    validationRules.maxLength(150, 'Last name'),
  ],
  bio: [validationRules.maxLength(1000, 'Bio')],
  avatar_url: [validationRules.url('Avatar URL')],
  banner_url: [validationRules.url('Banner URL')],
};

/**
 * Validate a form against a schema
 */
export function validateForm(
  formData: Record<string, any>,
  schema: Record<string, ValidationRule[]>
): ValidationResult {
  const errors: Record<string, string> = {};

  for (const [field, rules] of Object.entries(schema)) {
    for (const rule of rules) {
      const isValid = rule.validate(formData[field], formData);
      if (!isValid) {
        errors[field] = rule.message;
        break; // Stop at first error for this field
      }
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validate a single field
 */
export function validateField(
  fieldName: string,
  value: any,
  schema: Record<string, ValidationRule[]>,
  formData?: Record<string, any>
): string | null {
  const rules = schema[fieldName];
  if (!rules) return null;

  for (const rule of rules) {
    const isValid = rule.validate(value, formData);
    if (!isValid) {
      return rule.message;
    }
  }

  return null;
}
