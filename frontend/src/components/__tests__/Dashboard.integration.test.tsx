/**
 * Integration tests for Dashboard component with API
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { Dashboard } from '../Dashboard'
import { AuthProvider } from '../../lib/auth-context'
import { ToastProvider } from '../Toast'
import { testUsers, testServices } from '../../test/fixtures/test-data'
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

describe('Dashboard Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('loads and displays services from API', async () => {
    server.use(
      http.get('/api/users/me/', () => HttpResponse.json(testUsers[0])),
      http.get('/api/services/', () =>
        HttpResponse.json({
          results: testServices,
          count: testServices.length,
        })
      )
    )

    renderWithProviders(<Dashboard onNavigate={() => {}} />)

    await waitFor(() => {
      expect(screen.getByText(testServices[0].title)).toBeInTheDocument()
    })
  })

  it('handles API error gracefully', async () => {
    server.use(
      http.get('/api/users/me/', () => HttpResponse.json(testUsers[0])),
      http.get('/api/services/', () =>
        HttpResponse.json({ detail: 'Internal server error' }, { status: 500 })
      )
    )

    renderWithProviders(<Dashboard onNavigate={() => {}} />)

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument()
    })
  })

  it('filters services by type', async () => {
    server.use(
      http.get('/api/users/me/', () => HttpResponse.json(testUsers[0])),
      http.get('/api/services/', ({ request }) => {
        const url = new URL(request.url);
        const type = url.searchParams.get('type');
        const filtered = type ? testServices.filter((s) => s.type === type) : testServices;
        return HttpResponse.json({
          results: filtered,
          count: filtered.length,
        });
      })
    )

    renderWithProviders(<Dashboard onNavigate={() => {}} />)

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
