/**
 * Unit tests for API client functions
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { authAPI, userAPI, serviceAPI } from '../api'
import { testUsers, testServices } from '../../test/fixtures/test-data'

// Mock axios
vi.mock('axios', () => {
  const axios = vi.fn()
  axios.create = vi.fn(() => axios)
  axios.get = vi.fn()
  axios.post = vi.fn()
  axios.patch = vi.fn()
  axios.delete = vi.fn()
  return { default: axios }
})

describe('authAPI', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('login makes POST request to /api/auth/login/', async () => {
    const axios = (await import('axios')).default
    vi.mocked(axios.post).mockResolvedValue({
      data: {
        access: 'token',
        refresh: 'refresh-token',
        user: testUsers[0],
      },
    })

    await authAPI.login('test@example.com', 'password123')
    
    expect(axios.post).toHaveBeenCalledWith(
      '/api/auth/login/',
      { email: 'test@example.com', password: 'password123' }
    )
  })

  it('register makes POST request to /api/auth/register/', async () => {
    const axios = (await import('axios')).default
    vi.mocked(axios.post).mockResolvedValue({
      data: { id: 'user-1', email: 'test@example.com' },
    })

    await authAPI.register({
      email: 'test@example.com',
      password: 'password123',
      first_name: 'Test',
      last_name: 'User',
    })
    
    expect(axios.post).toHaveBeenCalledWith(
      '/api/auth/register/',
      expect.objectContaining({
        email: 'test@example.com',
        password: 'password123',
        first_name: 'Test',
        last_name: 'User',
      })
    )
  })
})

describe('userAPI', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('getCurrentUser makes GET request to /api/users/me/', async () => {
    const axios = (await import('axios')).default
    vi.mocked(axios.get).mockResolvedValue({
      data: testUsers[0],
    })

    const user = await userAPI.getCurrentUser()
    
    expect(axios.get).toHaveBeenCalledWith('/api/users/me/')
    expect(user).toEqual(testUsers[0])
  })

  it('updateProfile makes PATCH request to /api/users/me/', async () => {
    const axios = (await import('axios')).default
    vi.mocked(axios.patch).mockResolvedValue({
      data: { ...testUsers[0], bio: 'Updated bio' },
    })

    await userAPI.updateProfile({ bio: 'Updated bio' })
    
    expect(axios.patch).toHaveBeenCalledWith(
      '/api/users/me/',
      { bio: 'Updated bio' }
    )
  })
})

describe('serviceAPI', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('getServices makes GET request to /api/services/', async () => {
    const axios = (await import('axios')).default
    vi.mocked(axios.get).mockResolvedValue({
      data: {
        results: testServices,
        count: testServices.length,
      },
    })

    const response = await serviceAPI.getServices()
    
    expect(axios.get).toHaveBeenCalledWith('/api/services/', { params: {} })
    expect(response.results).toEqual(testServices)
  })

  it('getService makes GET request to /api/services/:id/', async () => {
    const axios = (await import('axios')).default
    const service = testServices[0]
    vi.mocked(axios.get).mockResolvedValue({
      data: service,
    })

    const result = await serviceAPI.getService(service.id)
    
    expect(axios.get).toHaveBeenCalledWith(`/api/services/${service.id}/`)
    expect(result).toEqual(service)
  })

  it('createService makes POST request to /api/services/', async () => {
    const axios = (await import('axios')).default
    const newService = {
      title: 'New Service',
      description: 'Service description',
      type: 'Offer' as const,
      duration: 2.0,
      max_participants: 1,
    }
    vi.mocked(axios.post).mockResolvedValue({
      data: { id: 'service-1', ...newService },
    })

    await serviceAPI.createService(newService)
    
    expect(axios.post).toHaveBeenCalledWith('/api/services/', newService)
  })
})
