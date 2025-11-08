import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../test/utils';
import { Dashboard } from '../Dashboard';

// Mock the API module
vi.mock('../../lib/api', () => ({
  serviceAPI: {
    list: vi.fn(),
  },
  authAPI: {},
  userAPI: {},
  tagAPI: {},
  handshakeAPI: {},
  chatAPI: {},
  notificationAPI: {},
  reputationAPI: {},
}));

vi.mock('../../lib/auth-context', () => ({
  useAuth: () => ({
    user: { id: 'test-user', email: 'test@example.com' },
    isAuthenticated: true,
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('../../components/Toast', () => ({
  ToastProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useToast: () => ({
    showToast: vi.fn(),
  }),
}));

describe('Dashboard', () => {
  const mockNavigate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', async () => {
    const { serviceAPI } = await import('../../lib/api');
    (serviceAPI.list as any).mockImplementation(() => new Promise(() => {}));

    render(<Dashboard onNavigate={mockNavigate} />);
    expect(screen.getByText(/loading services/i)).toBeInTheDocument();
  });

  it('renders services when loaded', async () => {
    const mockServices = [
      {
        id: '1',
        title: 'Test Service',
        description: 'Test description',
        type: 'Offer' as const,
        duration: 2.0,
        location_type: 'Online' as const,
        status: 'Active' as const,
        max_participants: 1,
        schedule_type: 'One-Time' as const,
        created_at: new Date().toISOString(),
      },
    ];

    const { serviceAPI } = await import('../../lib/api');
    (serviceAPI.list as any).mockResolvedValue(mockServices);

    render(<Dashboard onNavigate={mockNavigate} />);

    await waitFor(() => {
      expect(screen.getByText('Test Service')).toBeInTheDocument();
    }, { timeout: 3000 });
  });
});

