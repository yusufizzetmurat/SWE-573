/**
 * Integration tests for UserProfile component with API
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { UserProfile } from '../UserProfile'
import { AuthProvider } from '../../lib/auth-context'
import { ToastProvider } from '../Toast'
import { testUsers } from '../../test/fixtures/test-data'
import { server } from '../../test/setup'
import { http, HttpResponse } from 'msw'

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

describe('UserProfile Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    localStorage.setItem('access_token', 'test-token')
    localStorage.setItem('user_data', JSON.stringify(testUsers[0]))
  })

  it('loads and displays user profile from API', async () => {
    server.use(
      http.get('/api/users/me/', () => HttpResponse.json(testUsers[0]))
    )

    renderWithProviders(<UserProfile onNavigate={() => {}} />)

    await waitFor(() => {
      expect(screen.getByText(new RegExp(`${testUsers[0].first_name}\\s+${testUsers[0].last_name}`, 'i'))).toBeInTheDocument()
    })
  })

  it('updates profile via API', async () => {
    const user = userEvent.setup()
    let updatedBio = ''

    server.use(
      http.get('/api/users/me/', () => HttpResponse.json(testUsers[0])),
      http.patch('/api/users/me/', async ({ request }) => {
        const body = (await request.json()) as any;
        updatedBio = body.bio;
        return HttpResponse.json({
          ...testUsers[0],
          bio: body.bio,
        });
      })
    )

    renderWithProviders(<UserProfile onNavigate={() => {}} />)

    await waitFor(() => {
      expect(screen.getByText(new RegExp(`${testUsers[0].first_name}\\s+${testUsers[0].last_name}`, 'i'))).toBeInTheDocument()
    })

    const editButton = screen.getByRole('button', { name: /edit profile/i })
    await user.click(editButton)

    const bioInput = screen.getByLabelText(/bio/i)
    await user.clear(bioInput)
    await user.type(bioInput, 'Updated bio text')

    const saveButton = screen.getByRole('button', { name: /save/i })
    await user.click(saveButton)

    await waitFor(() => {
      expect(updatedBio).toBe('Updated bio text')
    })
  })

  it('handles profile update errors', async () => {
    const user = userEvent.setup()

    server.use(
      http.get('/api/users/me/', () => HttpResponse.json(testUsers[0])),
      http.patch('/api/users/me/', () =>
        HttpResponse.json(
          {
            detail: 'Validation error',
            bio: ['Bio cannot exceed 1000 characters'],
          },
          { status: 400 }
        )
      )
    )

    renderWithProviders(<UserProfile onNavigate={() => {}} />)

    await waitFor(() => {
      expect(screen.getByText(new RegExp(`${testUsers[0].first_name}\\s+${testUsers[0].last_name}`, 'i'))).toBeInTheDocument()
    })

    const editButton = screen.getByRole('button', { name: /edit profile/i })
    await user.click(editButton)

    const bioInput = screen.getByLabelText(/bio/i)
    await user.clear(bioInput)
    await user.type(bioInput, 'x'.repeat(1001))

    const saveButton = screen.getByRole('button', { name: /save/i })
    await user.click(saveButton)

    await waitFor(() => {
      expect(screen.getByText(/validation error/i)).toBeInTheDocument()
    })
  })
})
