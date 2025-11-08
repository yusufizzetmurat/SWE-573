import { describe, it, expect, vi, beforeEach } from 'vitest';
import apiClient from '../api-client';
import { authAPI, serviceAPI, chatAPI } from '../api';

vi.mock('../api-client');

describe('API Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('authAPI', () => {
    it('register calls correct endpoint', async () => {
      const mockResponse = { data: { access: 'token', refresh: 'refresh' } };
      (apiClient.post as any).mockResolvedValue(mockResponse);

      await authAPI.register({
        email: 'test@example.com',
        password: 'password123',
        first_name: 'Test',
        last_name: 'User',
      });

      expect(apiClient.post).toHaveBeenCalledWith(
        '/auth/register/',
        expect.objectContaining({
          email: 'test@example.com',
          password: 'password123',
        })
      );
    });

    it('login calls correct endpoint', async () => {
      const mockResponse = { data: { access: 'token', refresh: 'refresh' } };
      (apiClient.post as any).mockResolvedValue(mockResponse);

      await authAPI.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(apiClient.post).toHaveBeenCalledWith(
        '/auth/login/',
        {
          email: 'test@example.com',
          password: 'password123',
        }
      );
    });
  });

  describe('serviceAPI', () => {
    it('list calls correct endpoint', async () => {
      const mockResponse = { data: [] };
      (apiClient.get as any).mockResolvedValue(mockResponse);

      await serviceAPI.list();

      expect(apiClient.get).toHaveBeenCalled();
    });
  });

  describe('chatAPI', () => {
    it('listConversations calls correct endpoint', async () => {
      const mockResponse = { data: [] };
      (apiClient.get as any).mockResolvedValue(mockResponse);

      await chatAPI.listConversations();

      expect(apiClient.get).toHaveBeenCalledWith('/chats/');
    });

    it('sendMessage calls correct endpoint with data', async () => {
      const mockResponse = { data: { id: '1', body: 'test' } };
      (apiClient.post as any).mockResolvedValue(mockResponse);

      await chatAPI.sendMessage('handshake-id', 'test message');

      expect(apiClient.post).toHaveBeenCalledWith(
        '/chats/',
        {
          handshake_id: 'handshake-id',
          body: 'test message',
        }
      );
    });
  });
});

