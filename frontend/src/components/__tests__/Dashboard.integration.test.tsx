/**
 * Integration tests for Dashboard component with API
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import Dashboard from '../Dashboard'
import { AuthProvider } from '../../lib/auth-context'
import { ToastProvider } from '../Toast'
import { testUsers, testServices } from '../../test/fixtures/test-data'
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

describe('Dashboard Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('loads and displays services from API', async () => {
    server.use(
      rest.get('/api/users/me/', (req, res, ctx) => {
        return res(ctx.json(testUsers[0]))
      }),
      rest.get('/api/services/', (req, res, ctx) => {
        return res(ctx.json({
          results: testServices,
          count: testServices.length,
        }))
      })
    )

    renderWithProviders(<Dashboard />)

    await waitFor(() => {
      expect(screen.getByText(testServices[0].title)).toBeInTheDocument()
    })
  })

  it('handles API error gracefully', async () => {
    server.use(
      rest.get('/api/users/me/', (req, res, ctx) => {
        return res(ctx.json(testUsers[0]))
      }),
      rest.get('/api/services/', (req, res, ctx) => {
        return res(ctx.status(500), ctx.json({ detail: 'Internal server error' }))
      })
    )

    renderWithProviders(<Dashboard />)

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument()
    })
  })

  it('filters services by type', async () => {
    server.use(
      rest.get('/api/users/me/', (req, res, ctx) => {
        return res(ctx.json(testUsers[0]))
      }),
      rest.get('/api/services/', (req, res, ctx) => {
        const type = req.url.searchParams.get('type')
        const filtered = type 
          ? testServices.filter(s => s.type === type)
          : testServices
        return res(ctx.json({
          results: filtered,
          count: filtered.length,
        }))
      })
    )

    renderWithProviders(<Dashboard />)

    await waitFor(() => {
      expect(screen.getByText(testServices[0].title)).toBeInTheDocument()
    })

    const filterButton = screen.getByRole('button', { name: /offer/i })
    await userEvent.click(filterButton)

    await waitFor(() => {
      const offerServices = testServices.filter(s => s.type === 'Offer')
      if (offerServices.length > 0) {
        expect(screen.getByText(offerServices[0].title)).toBeInTheDocument()
      }
    })
  })
})
