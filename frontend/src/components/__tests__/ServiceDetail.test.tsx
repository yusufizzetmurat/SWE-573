import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../test/utils';
import { ServiceDetail } from '../ServiceDetail';
import { mockService } from '../../test/mocks';

vi.mock('../../lib/api', () => ({
  serviceAPI: {
    get: vi.fn(),
  },
  handshakeAPI: {
    list: vi.fn().mockResolvedValue([]),
    expressInterest: vi.fn(),
  },
  authAPI: {},
  userAPI: {},
  tagAPI: {},
  chatAPI: {},
  notificationAPI: {
    list: vi.fn().mockResolvedValue([]),
  },
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
  useToast: () => ({ showToast: vi.fn() }),
}));

describe('ServiceDetail', () => {
  const mockNavigate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders service details', async () => {
    const serviceData = {
      id: mockService.id,
      ...mockService,
      full: true, // Mark as full data so it doesn't try to fetch
    };
    
    render(
      <ServiceDetail
        onNavigate={mockNavigate}
        serviceData={serviceData}
        userBalance={5.0}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(mockService.title)).toBeInTheDocument();
      expect(screen.getByText(mockService.description)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('displays express interest button for authenticated users', async () => {
    const serviceData = {
      id: mockService.id,
      ...mockService,
      full: true, // Mark as full data so it doesn't try to fetch
    };
    
    render(
      <ServiceDetail
        onNavigate={mockNavigate}
        serviceData={serviceData}
        userBalance={5.0}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /express interest/i })).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('shows loading state when service data is null', () => {
    render(
      <ServiceDetail
        onNavigate={mockNavigate}
        serviceData={null}
        userBalance={5.0}
      />
    );

    expect(screen.getByText(/loading service details/i)).toBeInTheDocument();
  });
});

