/**
 * Integration tests for UserProfile component with API
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import UserProfile from '../UserProfile'
import { AuthProvider } from '../../lib/auth-context'
import { ToastProvider } from '../Toast'
import { testUsers } from '../../test/fixtures/test-data'
import { server } from '../../test/setup'
import { rest } from 'msw'

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
  })

  it('loads and displays user profile from API', async () => {
    server.use(
      rest.get('/api/users/me/', (req, res, ctx) => {
        return res(ctx.json(testUsers[0]))
      })
    )

    renderWithProviders(<UserProfile />)

    await waitFor(() => {
      expect(screen.getByText(testUsers[0].first_name)).toBeInTheDocument()
      expect(screen.getByText(testUsers[0].email)).toBeInTheDocument()
    })
  })

  it('updates profile via API', async () => {
    const user = userEvent.setup()
    let updatedBio = ''

    server.use(
      rest.get('/api/users/me/', (req, res, ctx) => {
        return res(ctx.json(testUsers[0]))
      }),
      rest.patch('/api/users/me/', (req, res, ctx) => {
        const body = req.body as any
        updatedBio = body.bio
        return res(ctx.json({
          ...testUsers[0],
          bio: body.bio,
        }))
      })
    )

    renderWithProviders(<UserProfile />)

    await waitFor(() => {
      expect(screen.getByText(testUsers[0].first_name)).toBeInTheDocument()
    })

    const editButton = screen.getByRole('button', { name: /edit/i })
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
      rest.get('/api/users/me/', (req, res, ctx) => {
        return res(ctx.json(testUsers[0]))
      }),
      rest.patch('/api/users/me/', (req, res, ctx) => {
        return res(ctx.status(400), ctx.json({
          detail: 'Validation error',
          bio: ['Bio cannot exceed 1000 characters'],
        }))
      })
    )

    renderWithProviders(<UserProfile />)

    await waitFor(() => {
      expect(screen.getByText(testUsers[0].first_name)).toBeInTheDocument()
    })

    const editButton = screen.getByRole('button', { name: /edit/i })
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
