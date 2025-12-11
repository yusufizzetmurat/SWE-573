/**
 * Application-wide constants
 * Centralized location for all magic numbers and configuration values
 */

// API Configuration
export const API_TIMEOUT = 10000; // 10 seconds

// Polling Intervals (in milliseconds)
export const POLLING_INTERVALS = {
  NOTIFICATIONS: 10000, // 10 seconds
  MESSAGES: 3000, // 3 seconds
  CONVERSATIONS: 15000, // 15 seconds
  SERVICES: 30000, // 30 seconds
  HANDSHAKE: 3000, // 3 seconds
  NOTIFICATION_DROPDOWN: 60000, // 60 seconds
} as const;

// Debounce Delays (in milliseconds)
export const DEBOUNCE_DELAYS = {
  SEARCH: 500, // 500ms for search input
  DISTANCE_SLIDER: 300, // 300ms for distance slider
  WIKIDATA_SEARCH: 300, // 300ms for Wikidata autocomplete
} as const;

// Geolocation Configuration
export const GEOLOCATION_CONFIG = {
  ENABLE_HIGH_ACCURACY: true,
  TIMEOUT: 10000, // 10 seconds
  MAXIMUM_AGE: 300000, // 5 minutes (cache duration)
} as const;

// Map Configuration
export const MAP_CONFIG = {
  DEFAULT_ZOOM: 11,
  FUZZY_RADIUS_METERS: 5000, // 5km radius for fuzzy location on homepage
  SERVICE_FUZZY_RADIUS_METERS: 3000, // 3km radius for fuzzy location on service detail
  CIRCLE_MARKER_RADIUS_PIXELS: 8, // Small marker for clickable point
} as const;

// Distance Search Configuration
export const DISTANCE_SEARCH = {
  MIN_KM: 1,
  MAX_KM: 50,
  DEFAULT_KM: 10,
} as const;

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 100,
  FORUM_POSTS_PER_PAGE: 20,
} as const;

// Service Media Configuration
export const SERVICE_MEDIA = {
  MAX_PORTFOLIO_IMAGES: 5,
  MAX_VIDEOS: 1,
  GRID_COLUMNS: 2,
  GRID_ROWS: 3,
} as const;

// Authentication
export const AUTH = {
  TOKEN_REFRESH_DELAY: 500, // Wait 500ms after auth to ensure tokens are set
} as const;

// UI Configuration
export const UI = {
  TOAST_DURATION: 3000, // 3 seconds
  MODAL_ANIMATION_DELAY: 100, // 100ms delay for modal animations
} as const;




