// Mock API responses
export const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  first_name: 'Test',
  last_name: 'User',
  timebank_balance: 5.0,
  karma_score: 10,
  role: 'member' as const,
};

export const mockService = {
  id: 'test-service-id',
  title: 'Test Service',
  description: 'This is a test service',
  type: 'Offer' as const,
  duration: 2.0,
  location_type: 'Online' as const,
  status: 'Active' as const,
  max_participants: 1,
  schedule_type: 'One-Time' as const,
  created_at: new Date().toISOString(),
  user: mockUser,
};

export const mockHandshake = {
  id: 'test-handshake-id',
  service: 'test-service-id',
  service_title: 'Test Service',
  requester: 'test-user-id',
  requester_name: 'Test User',
  provider_name: 'Provider User',
  status: 'pending' as const,
  provisioned_hours: 2.0,
  provider_confirmed_complete: false,
  receiver_confirmed_complete: false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export const mockChatMessage = {
  id: 'test-message-id',
  handshake: 'test-handshake-id',
  sender: 'test-user-id',
  sender_id: 'test-user-id',
  sender_name: 'Test User',
  body: 'Test message',
  created_at: new Date().toISOString(),
};

