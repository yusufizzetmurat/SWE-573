import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginPage } from '../LoginPage';

const mockLogin = vi.fn().mockResolvedValue({ access: 'token', refresh: 'refresh' });

vi.mock('../../lib/api', () => ({
  authAPI: {
    login: mockLogin,
  },
  serviceAPI: {},
  userAPI: {},
  tagAPI: {},
  handshakeAPI: {},
  chatAPI: {},
  notificationAPI: {},
  reputationAPI: {},
}));

vi.mock('../../lib/auth-context', () => ({
  useAuth: () => ({
    login: mockLogin,
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('../../components/Toast', () => ({
  ToastProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useToast: () => ({ showToast: vi.fn() }),
}));

describe('LoginPage', () => {
  const mockNavigate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders login form', () => {
    render(<LoginPage onNavigate={mockNavigate} />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    const user = userEvent.setup();
    render(<LoginPage onNavigate={mockNavigate} />);

    const submitButton = screen.getByRole('button', { name: /log in/i });
    await user.click(submitButton);

    // HTML5 validation should prevent submission
    await waitFor(() => {
      const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;
      expect(emailInput.validity.valueMissing).toBe(true);
    });
  });

  it('submits form with valid data', async () => {
    const user = userEvent.setup();
    render(<LoginPage onNavigate={mockNavigate} />);

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /log in/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123');
    });
  });
});

