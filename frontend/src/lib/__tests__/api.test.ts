/**
 * Unit tests for API client functions
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authAPI, userAPI, serviceAPI } from '../api';
import apiClient from '../api-client';
import { testUsers, testServices } from '../../test/fixtures/test-data';

vi.mock('../api-client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockedApiClient = apiClient as unknown as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  patch: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

describe('authAPI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('login makes POST request to /auth/login/', async () => {
    mockedApiClient.post.mockResolvedValue({
      data: {
        access: 'token',
        refresh: 'refresh-token',
        user: testUsers[0],
      },
    });

    await authAPI.login({ email: 'test@example.com', password: 'password123' });

    expect(mockedApiClient.post).toHaveBeenCalledWith(
      '/auth/login/',
      { email: 'test@example.com', password: 'password123' },
      expect.objectContaining({ signal: undefined })
    );
  });

  it('register makes POST request to /auth/register/', async () => {
    mockedApiClient.post.mockResolvedValue({
      data: { id: 'user-1', email: 'test@example.com' },
    });

    await authAPI.register({
      email: 'test@example.com',
      password: 'password123',
      first_name: 'Test',
      last_name: 'User',
    });

    expect(mockedApiClient.post).toHaveBeenCalledWith(
      '/auth/register/',
      expect.objectContaining({
        email: 'test@example.com',
        password: 'password123',
        first_name: 'Test',
        last_name: 'User',
      }),
      expect.objectContaining({ signal: undefined })
    );
  });
});

describe('userAPI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getMe makes GET request to /users/me/', async () => {
    mockedApiClient.get.mockResolvedValue({
      data: testUsers[0],
    });

    const user = await userAPI.getMe();

    expect(mockedApiClient.get).toHaveBeenCalledWith(
      '/users/me/',
      expect.objectContaining({ signal: undefined })
    );
    expect(user).toEqual(testUsers[0]);
  });

  it('updateMe makes PATCH request to /users/me/', async () => {
    mockedApiClient.patch.mockResolvedValue({
      data: { ...testUsers[0], bio: 'Updated bio' },
    });

    await userAPI.updateMe({ bio: 'Updated bio' });

    expect(mockedApiClient.patch).toHaveBeenCalledWith(
      '/users/me/',
      { bio: 'Updated bio' },
      expect.objectContaining({ signal: undefined })
    );
  });
});

describe('serviceAPI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('list makes GET request to /services/ with default page_size', async () => {
    mockedApiClient.get.mockResolvedValue({
      data: {
        results: testServices,
        count: testServices.length,
      },
    });

    const services = await serviceAPI.list();

    expect(mockedApiClient.get).toHaveBeenCalledWith(
      '/services/',
      expect.objectContaining({
        params: expect.objectContaining({ page_size: 100 }),
        signal: undefined,
      })
    );
    expect(services).toEqual(testServices);
  });
});
