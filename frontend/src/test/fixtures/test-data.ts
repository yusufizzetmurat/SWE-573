/**
 * Frontend test data fixtures
 */

export interface TestUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  bio?: string;
  avatar_url?: string;
  timebank_balance: number;
  karma_score: number;
  role: 'member' | 'admin';
  achievements?: string[];
  badges?: string[];
  date_joined?: string;
}

export interface TestService {
  id: string;
  user: string | TestUser;
  title: string;
  description: string;
  type: 'Offer' | 'Need';
  duration: number;
  location_type: 'In-Person' | 'Online';
  location_area?: string;
  status: 'Active' | 'Completed' | 'Cancelled';
  max_participants: number;
  created_at: string;
}

export const testUsers: TestUser[] = [
  {
    id: 'user-1',
    email: 'testuser1@example.com',
    first_name: 'Test',
    last_name: 'User1',
    timebank_balance: 5.0,
    karma_score: 10,
    role: 'member',
    achievements: ['first-service'],
  },
  {
    id: 'user-2',
    email: 'testuser2@example.com',
    first_name: 'Test',
    last_name: 'User2',
    timebank_balance: 3.0,
    karma_score: 5,
    role: 'member',
    achievements: [],
  },
];

export const testServices: TestService[] = [
  {
    id: 'service-1',
    user: 'user-1',
    title: 'Cooking Lesson',
    description: 'Learn to cook traditional dishes',
    type: 'Offer',
    duration: 2.0,
    location_type: 'In-Person',
    location_area: 'Beşiktaş',
    status: 'Active',
    max_participants: 2,
    created_at: new Date().toISOString(),
  },
  {
    id: 'service-2',
    user: 'user-2',
    title: 'Need Help with Tech',
    description: 'Looking for help setting up my computer',
    type: 'Need',
    duration: 1.5,
    location_type: 'Online',
    status: 'Active',
    max_participants: 1,
    created_at: new Date().toISOString(),
  },
];

export const mockAuthToken = 'mock-jwt-token-12345';
export const mockRefreshToken = 'mock-refresh-token-12345';
