/**
 * Unit tests for LoginPage component
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { LoginPage } from '../LoginPage'
import { AuthProvider } from '../../lib/auth-context'
import { ToastProvider } from '../Toast'

// Mock the API
vi.mock('../../lib/api', () => ({
  authAPI: {
    login: vi.fn(),
  },
}))

const mockOnNavigate = vi.fn()

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          {component}
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  )
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders login form', () => {
    renderWithProviders(<LoginPage onNavigate={mockOnNavigate} />)
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument()
  })

  it('validates required fields', async () => {
    const user = userEvent.setup()
    renderWithProviders(<LoginPage onNavigate={mockOnNavigate} />)
    
    const submitButton = screen.getByRole('button', { name: /log in/i })
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument()
    })
  })

  it('submits form with valid data', async () => {
    const user = userEvent.setup()
    const { authAPI } = await import('../../lib/api')
    vi.mocked(authAPI.login).mockResolvedValue({
      access: 'token',
      refresh: 'refresh-token',
      user: {
        id: 'user-1',
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        timebank_balance: 3.0,
        karma_score: 0,
        role: 'member',
      },
    })

    renderWithProviders(<LoginPage onNavigate={mockOnNavigate} />)
    
    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /log in/i })
    
    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'password123')
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(authAPI.login).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      })
    })
  })

  it('displays error message on login failure', async () => {
    const user = userEvent.setup()
    const { authAPI } = await import('../../lib/api')
    vi.mocked(authAPI.login).mockRejectedValue(new Error('Invalid credentials'))

    renderWithProviders(<LoginPage onNavigate={mockOnNavigate} />)
    
    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /log in/i })
    
    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'wrongpassword')
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument()
    })
  })
})
