/** Tests for RegistrationPage component */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RegistrationPage } from '../RegistrationPage';

// Mock the auth context
const mockRegister = vi.fn();
const mockNavigate = vi.fn();

vi.mock('../../lib/auth-context', () => ({
  useAuth: () => ({
    register: mockRegister,
    isAuthenticated: false,
    isLoading: false,
  }),
}));

// Mock toast
vi.mock('../../components/Toast', () => ({
  useToast: () => ({
    showToast: vi.fn(),
  }),
}));

describe('RegistrationPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders registration form with all required fields', () => {
    render(<RegistrationPage onNavigate={mockNavigate} onRegister={mockRegister} />);
    
    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
  });

  it('calls register function with form data on submit', async () => {
    mockRegister.mockResolvedValue(undefined);
    
    render(<RegistrationPage onNavigate={mockNavigate} onRegister={mockRegister} />);
    
    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'John' } });
    fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'Doe' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'john@example.com' } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'password123' } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'password123' } });

    fireEvent.click(screen.getByRole('checkbox'));
    
    const submitButton = screen.getByRole('button', { name: /create account/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith({
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
        password: 'password123',
      });
    });
  });

  it('validates required fields', async () => {
    render(<RegistrationPage onNavigate={mockNavigate} onRegister={mockRegister} />);
    
    const submitButton = screen.getByRole('button', { name: /create account/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/first name is required/i)).toBeInTheDocument();
    });
  });

  it('navigates to login page when login link is clicked', () => {
    render(<RegistrationPage onNavigate={mockNavigate} onRegister={mockRegister} />);
    
    const loginLink = screen.getByText(/log in/i);
    fireEvent.click(loginLink);
    
    expect(mockNavigate).toHaveBeenCalledWith('login');
  });
});
