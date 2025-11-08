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
  register: async (data: RegisterData): Promise<AuthResponse> => {
    const response = await apiClient.post('/auth/register/', data);
    return response.data;
  },

  login: async (data: LoginData): Promise<AuthResponse> => {
    const response = await apiClient.post('/auth/login/', data);
    return response.data;
  },

  refreshToken: async (refresh: string): Promise<{ access: string }> => {
    const response = await apiClient.post('/auth/refresh/', { refresh });
    return response.data;
  },
};

// User API
export const userAPI = {
  getMe: async (): Promise<User> => {
    const response = await apiClient.get('/users/me/');
    return response.data;
  },

  updateMe: async (data: Partial<User>): Promise<User> => {
    const response = await apiClient.put('/users/me/', data);
    return response.data;
  },

  getUser: async (id: string): Promise<User> => {
    const response = await apiClient.get(`/users/${id}/`);
    return response.data;
  },
};

// Service API
export const serviceAPI = {
  list: async (params?: {
    type?: 'Offer' | 'Need';
    tag?: string;
    search?: string;
  }): Promise<Service[]> => {
    const response = await apiClient.get('/services/', { params });
    return response.data;
  },

  get: async (id: string): Promise<Service> => {
    const response = await apiClient.get(`/services/${id}/`);
    return response.data;
  },

  create: async (data: CreateServiceData): Promise<Service> => {
    const response = await apiClient.post('/services/', data);
    return response.data;
  },

  update: async (id: string, data: Partial<CreateServiceData>): Promise<Service> => {
    const response = await apiClient.put(`/services/${id}/`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/services/${id}/`);
  },
};

// Tag API
export const tagAPI = {
  list: async (): Promise<Tag[]> => {
    const response = await apiClient.get('/tags/');
    return response.data;
  },
  create: async (name: string): Promise<Tag> => {
    const response = await apiClient.post('/tags/', { name });
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
  expressInterest: async (serviceId: string): Promise<Handshake> => {
    const response = await apiClient.post(`/services/${serviceId}/interest/`, {});
    return response.data;
  },

  list: async (): Promise<Handshake[]> => {
    const response = await apiClient.get('/handshakes/');
    return response.data;
  },

  accept: async (handshakeId: string): Promise<Handshake> => {
    const response = await apiClient.post(`/handshakes/${handshakeId}/accept/`);
    return response.data;
  },

  initiate: async (handshakeId: string, data: { exact_location: string; exact_duration: number; scheduled_time: string }): Promise<Handshake> => {
    const response = await apiClient.post(`/handshakes/${handshakeId}/initiate/`, data);
    return response.data;
  },

  approve: async (handshakeId: string): Promise<Handshake> => {
    const response = await apiClient.post(`/handshakes/${handshakeId}/approve/`, {});
    return response.data;
  },

  deny: async (handshakeId: string): Promise<Handshake> => {
    const response = await apiClient.post(`/handshakes/${handshakeId}/deny/`);
    return response.data;
  },

  cancel: async (handshakeId: string): Promise<Handshake> => {
    const response = await apiClient.post(`/handshakes/${handshakeId}/cancel/`);
    return response.data;
  },

  get: async (handshakeId: string): Promise<Handshake> => {
    const response = await apiClient.get(`/handshakes/${handshakeId}/`);
    return response.data;
  },

  confirm: async (handshakeId: string, hours?: number): Promise<Handshake> => {
    const payload: any = {};
    if (hours !== undefined) {
      payload.hours = hours;
    }
    const response = await apiClient.post(`/handshakes/${handshakeId}/confirm/`, payload);
    return response.data;
  },

  report: async (handshakeId: string, issueType: string, description?: string): Promise<{status: string, report_id: string}> => {
    const response = await apiClient.post(`/handshakes/${handshakeId}/report/`, {
      issue_type: issueType,
      description
    });
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
}

export const chatAPI = {
  listConversations: async (): Promise<Conversation[]> => {
    const response = await apiClient.get('/chats/');
    return response.data;
  },

  getMessages: async (handshakeId: string): Promise<ChatMessage[]> => {
    const response = await apiClient.get(`/chats/${handshakeId}/`);
    return response.data;
  },

  sendMessage: async (handshakeId: string, body: string): Promise<ChatMessage> => {
    const response = await apiClient.post('/chats/', {
      handshake_id: handshakeId,
      body
    });
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

export const notificationAPI = {
  list: async (): Promise<Notification[]> => {
    const response = await apiClient.get('/notifications/');
    return response.data;
  },

  markAllRead: async (): Promise<void> => {
    await apiClient.post('/notifications/read/');
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
  submit: async (handshakeId: string, reps: {punctual: boolean, helpful: boolean, kindness: boolean}): Promise<ReputationRep> => {
    const response = await apiClient.post('/reputation/', {
      handshake_id: handshakeId,
      punctual: reps.punctual,
      helpful: reps.helpful,
      kindness: reps.kindness
    });
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
  getReports: async (): Promise<Report[]> => {
    const response = await apiClient.get('/admin/reports/');
    return response.data;
  },

  resolveReport: async (reportId: string, action: string, adminNotes?: string): Promise<Report> => {
    const response = await apiClient.post(`/admin/reports/${reportId}/resolve/`, {
      action,
      admin_notes: adminNotes
    });
    return response.data;
  },

  warnUser: async (userId: string, message: string): Promise<{status: string, message: string}> => {
    const response = await apiClient.post(`/admin/users/${userId}/warn/`, { message });
    return response.data;
  },

  banUser: async (userId: string): Promise<{status: string, message: string}> => {
    const response = await apiClient.post(`/admin/users/${userId}/ban/`);
    return response.data;
  },

  adjustKarma: async (userId: string, adjustment: number): Promise<{status: string, new_karma: number, message: string}> => {
    const response = await apiClient.post(`/admin/users/${userId}/adjust-karma/`, { adjustment });
    return response.data;
  },
};


