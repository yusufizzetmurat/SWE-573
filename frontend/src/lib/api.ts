import apiClient from './api-client';

// Types
export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  bio?: string;
  avatar_url?: string;
  banner_url?: string;
  timebank_balance: number;
  karma_score: number;
  role: 'member' | 'admin';
  services?: Service[];
  punctual_count?: number;
  helpful_count?: number;
  kind_count?: number;
  badges?: string[];
  date_joined?: string;
  featured_badge?: string | null;
}

export interface Service {
  id: string;
  user?: string | User;
  title: string;
  description: string;
  type: 'Offer' | 'Need';
  duration: number;
  location_type: 'In-Person' | 'Online';
  location_area?: string;
  location_lat?: number | string;
  location_lng?: number | string;
  status: 'Active' | 'Completed' | 'Cancelled';
  max_participants: number;
  schedule_type: 'One-Time' | 'Recurrent';
  schedule_details?: string;
  created_at: string;
  tags?: Tag[];
}

export interface Tag {
  id: string;
  name: string;
  description?: string;
}

export interface WikidataItem {
  id: string;       // QID like "Q28865"
  label: string;    // "Python"
  description?: string; // "high-level programming language"
}

export interface RegisterData {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthResponse {
  access: string;
  refresh: string;
  user?: User;
}

export interface CreateServiceData {
  title: string;
  description: string;
  type: 'Offer' | 'Need';
  duration: number;
  location_type: 'In-Person' | 'Online';
  location_area?: string;
  location_lat?: number | string;
  location_lng?: number | string;
  max_participants: number;
  schedule_type: 'One-Time' | 'Recurrent';
  schedule_details?: string;
  tags?: string[]; // Array of tag IDs
  tag_names?: string[]; // Array of tag names to create
}

// Auth API
export const authAPI = {
  register: async (data: RegisterData, signal?: AbortSignal): Promise<AuthResponse> => {
    const response = await apiClient.post('/auth/register/', data, { signal });
    return response.data;
  },

  login: async (data: LoginData, signal?: AbortSignal): Promise<AuthResponse> => {
    const response = await apiClient.post('/auth/login/', data, { signal });
    return response.data;
  },

  refreshToken: async (refresh: string, signal?: AbortSignal): Promise<{ access: string }> => {
    const response = await apiClient.post('/auth/refresh/', { refresh }, { signal });
    return response.data;
  },
};

// User API
export const userAPI = {
  getMe: async (signal?: AbortSignal): Promise<User> => {
    const response = await apiClient.get('/users/me/', { signal });
    return response.data;
  },

  updateMe: async (data: Partial<User>, signal?: AbortSignal): Promise<User> => {
    const response = await apiClient.patch('/users/me/', data, { signal });
    return response.data;
  },

  getUser: async (id: string, signal?: AbortSignal): Promise<User> => {
    const response = await apiClient.get(`/users/${id}/`, { signal });
    return response.data;
  },
};

// Service API
export const serviceAPI = {
  list: async (params?: {
    type?: 'Offer' | 'Need';
    tag?: string;
    tags?: string[];
    search?: string;
    lat?: number;
    lng?: number;
    distance?: number;  // in kilometers
    page?: number;
    page_size?: number;
  }, signal?: AbortSignal): Promise<Service[]> => {
    const response = await apiClient.get('/services/', { 
      params: { ...params, page_size: params?.page_size || 100 },
      signal 
    });
    if (response.data.results) {
      return response.data.results;
    }
    return response.data;
  },

  get: async (id: string, signal?: AbortSignal): Promise<Service> => {
    const response = await apiClient.get(`/services/${id}/`, { signal });
    return response.data;
  },

  create: async (data: CreateServiceData, signal?: AbortSignal): Promise<Service> => {
    const response = await apiClient.post('/services/', data, { signal });
    return response.data;
  },

  update: async (id: string, data: Partial<CreateServiceData>, signal?: AbortSignal): Promise<Service> => {
    const response = await apiClient.put(`/services/${id}/`, data, { signal });
    return response.data;
  },

  delete: async (id: string, signal?: AbortSignal): Promise<void> => {
    await apiClient.delete(`/services/${id}/`, { signal });
  },
};

// Tag API
export const tagAPI = {
  list: async (signal?: AbortSignal): Promise<Tag[]> => {
    const response = await apiClient.get('/tags/', { signal });
    return response.data;
  },
  create: async (name: string, signal?: AbortSignal): Promise<Tag> => {
    const response = await apiClient.post('/tags/', { name }, { signal });
    return response.data;
  },
};

// Handshake API
export interface Handshake {
  id: string;
  service: string | { id: string };
  service_title: string;
  requester: string;
  requester_name: string;
  provider_name: string;
  status: 'pending' | 'accepted' | 'denied' | 'cancelled' | 'completed' | 'reported';
  provisioned_hours: number;
  provider_confirmed_complete: boolean;
  receiver_confirmed_complete: boolean;
  exact_location?: string;
  exact_duration?: number;
  scheduled_time?: string;
  provider_initiated?: boolean;
  requester_initiated?: boolean;
  created_at: string;
  updated_at: string;
}

export const handshakeAPI = {
  expressInterest: async (serviceId: string, signal?: AbortSignal): Promise<Handshake> => {
    const response = await apiClient.post(`/services/${serviceId}/interest/`, {}, { signal });
    return response.data;
  },

  list: async (signal?: AbortSignal): Promise<Handshake[]> => {
    const response = await apiClient.get('/handshakes/', { signal });
    return response.data;
  },

  accept: async (handshakeId: string, signal?: AbortSignal): Promise<Handshake> => {
    const response = await apiClient.post(`/handshakes/${handshakeId}/accept/`, {}, { signal });
    return response.data;
  },

  initiate: async (handshakeId: string, data: { exact_location: string; exact_duration: number; scheduled_time: string }, signal?: AbortSignal): Promise<Handshake> => {
    const response = await apiClient.post(`/handshakes/${handshakeId}/initiate/`, data, { signal });
    return response.data;
  },

  approve: async (handshakeId: string, signal?: AbortSignal): Promise<Handshake> => {
    const response = await apiClient.post(`/handshakes/${handshakeId}/approve/`, {}, { signal });
    return response.data;
  },
  
  requestChanges: async (handshakeId: string, signal?: AbortSignal): Promise<Handshake> => {
    const response = await apiClient.post(`/handshakes/${handshakeId}/request-changes/`, {}, { signal });
    return response.data;
  },
  
  decline: async (handshakeId: string, signal?: AbortSignal): Promise<Handshake> => {
    const response = await apiClient.post(`/handshakes/${handshakeId}/decline/`, {}, { signal });
    return response.data;
  },

  deny: async (handshakeId: string, signal?: AbortSignal): Promise<Handshake> => {
    const response = await apiClient.post(`/handshakes/${handshakeId}/deny/`, {}, { signal });
    return response.data;
  },

  cancel: async (handshakeId: string, signal?: AbortSignal): Promise<Handshake> => {
    const response = await apiClient.post(`/handshakes/${handshakeId}/cancel/`, {}, { signal });
    return response.data;
  },

  get: async (handshakeId: string, signal?: AbortSignal): Promise<Handshake> => {
    const response = await apiClient.get(`/handshakes/${handshakeId}/`, { signal });
    return response.data;
  },

  confirm: async (handshakeId: string, hours?: number, signal?: AbortSignal): Promise<Handshake> => {
    const payload: any = {};
    if (hours !== undefined) {
      payload.hours = hours;
    }
    const response = await apiClient.post(`/handshakes/${handshakeId}/confirm/`, payload, { signal });
    return response.data;
  },

  report: async (handshakeId: string, issueType: string, description?: string, signal?: AbortSignal): Promise<{status: string, report_id: string}> => {
    const response = await apiClient.post(`/handshakes/${handshakeId}/report/`, {
      issue_type: issueType,
      description
    }, { signal });
    return response.data;
  },
};

// Chat API
export interface ChatMessage {
  id: string;
  handshake: string;
  sender: string;
  sender_id: string;
  sender_name: string;
  sender_avatar_url?: string;
  body: string;
  created_at: string;
}

export interface Conversation {
  handshake_id: string;
  service_title: string;
  other_user: {
    id: string;
    name: string;
    avatar_url?: string;
  };
  last_message: ChatMessage | null;
  status: string;
  provider_confirmed_complete?: boolean;
  receiver_confirmed_complete?: boolean;
  is_provider?: boolean;  // True if current user is the provider
  provider_initiated?: boolean;
  requester_initiated?: boolean;
  exact_location?: string;
  exact_duration?: number;
  scheduled_time?: string;
  provisioned_hours?: number;
  user_has_reviewed?: boolean;  // True if current user has already left reputation
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export const chatAPI = {
  listConversations: async (signal?: AbortSignal, forceRefresh?: boolean): Promise<Conversation[]> => {
    // Add cache-busting query param to force fresh data from server
    const params = forceRefresh ? { _t: Date.now() } : {};
    const response = await apiClient.get('/chats/', { params, signal });
    return response.data.results || response.data;
  },

  getMessages: async (handshakeId: string, page?: number, signal?: AbortSignal): Promise<PaginatedResponse<ChatMessage>> => {
    const params = page ? { page } : {};
    const response = await apiClient.get(`/chats/${handshakeId}/`, { params, signal });
    return response.data;
  },

  sendMessage: async (handshakeId: string, body: string, signal?: AbortSignal): Promise<ChatMessage> => {
    const response = await apiClient.post('/chats/', {
      handshake_id: handshakeId,
      body
    }, { signal });
    return response.data;
  },
};

// Notification API
export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  related_handshake?: string;
  related_service?: string;
  created_at: string;
}

// Transaction History API
export interface Transaction {
  id: string;
  transaction_type: 'provision' | 'transfer' | 'refund' | 'adjustment';
  transaction_type_display: string;
  amount: number;
  balance_after: number;
  description: string;
  service_title?: string;
  created_at: string;
}

export const transactionAPI = {
  list: async (signal?: AbortSignal): Promise<Transaction[]> => {
    const response = await apiClient.get('/transactions/', { signal });
    return response.data.results || response.data;
  },
};

export const notificationAPI = {
  list: async (signal?: AbortSignal): Promise<Notification[]> => {
    const response = await apiClient.get('/notifications/', { signal });
    return response.data;
  },

  markAllRead: async (signal?: AbortSignal): Promise<void> => {
    await apiClient.post('/notifications/read/', {}, { signal });
  },
};

// Reputation API
export interface ReputationRep {
  id: string;
  handshake: string;
  giver: string;
  giver_name: string;
  receiver: string;
  receiver_name: string;
  is_punctual: boolean;
  is_helpful: boolean;
  is_kind: boolean;
  created_at: string;
}

export const reputationAPI = {
  submit: async (handshakeId: string, reps: {punctual: boolean, helpful: boolean, kindness: boolean}, signal?: AbortSignal): Promise<ReputationRep> => {
    const response = await apiClient.post('/reputation/', {
      handshake_id: handshakeId,
      punctual: reps.punctual,
      helpful: reps.helpful,
      kindness: reps.kindness
    }, { signal });
    return response.data;
  },
};

// Admin API
export interface Report {
  id: string;
  reporter: string;
  reporter_name: string;
  reported_user?: string;
  reported_user_name?: string;
  reported_service?: string;
  related_handshake?: string;
  type: string;
  status: string;
  description: string;
  admin_notes?: string;
  created_at: string;
  resolved_at?: string;
  resolved_by?: string;
}

export const adminAPI = {
  getReports: async (signal?: AbortSignal): Promise<Report[]> => {
    const response = await apiClient.get('/admin/reports/', { signal });
    return response.data;
  },

  resolveReport: async (reportId: string, action: string, adminNotes?: string, signal?: AbortSignal): Promise<Report> => {
    const response = await apiClient.post(`/admin/reports/${reportId}/resolve/`, {
      action,
      admin_notes: adminNotes
    }, { signal });
    return response.data;
  },

  warnUser: async (userId: string, message: string, signal?: AbortSignal): Promise<{status: string, message: string}> => {
    const response = await apiClient.post(`/admin/users/${userId}/warn/`, { message }, { signal });
    return response.data;
  },

  banUser: async (userId: string, signal?: AbortSignal): Promise<{status: string, message: string}> => {
    const response = await apiClient.post(`/admin/users/${userId}/ban/`, {}, { signal });
    return response.data;
  },

  adjustKarma: async (userId: string, adjustment: number, signal?: AbortSignal): Promise<{status: string, new_karma: number, message: string}> => {
    const response = await apiClient.post(`/admin/users/${userId}/adjust-karma/`, { adjustment }, { signal });
    return response.data;
  },
};

// Wikidata API
export const wikidataAPI = {
  search: async (query: string, limit: number = 10, signal?: AbortSignal): Promise<WikidataItem[]> => {
    if (!query.trim()) {
      return [];
    }
    const response = await apiClient.get('/wikidata/search/', { 
      params: { q: query, limit },
      signal 
    });
    return response.data;
  },
};
