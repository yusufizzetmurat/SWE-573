/**
 * API mocking utilities using MSW (Mock Service Worker)
 * Note: MSW needs to be installed: npm install --save-dev msw
 */

import { http, HttpResponse } from 'msw';
import { testUsers, testServices } from '../fixtures/test-data';

export const handlers = [
  // Auth endpoints
  http.post('/api/auth/login/', async ({ request }) => {
    const body = await request.json() as { email: string; password: string };
    if (body.email === 'test@example.com' && body.password === 'password123') {
      return HttpResponse.json({
        access: 'mock-access-token',
        refresh: 'mock-refresh-token',
      });
    }
    return HttpResponse.json(
      { detail: 'Invalid credentials' },
      { status: 401 }
    );
  }),

  http.post('/api/auth/register/', async ({ request }) => {
    const body = await request.json() as { email: string; password: string; first_name: string; last_name: string };
    return HttpResponse.json({
      id: 'new-user-id',
      email: body.email,
      first_name: body.first_name,
      last_name: body.last_name,
    }, { status: 201 });
  }),

  // User endpoints
  http.get('/api/users/me/', () => {
    return HttpResponse.json(testUsers[0]);
  }),

  http.get('/api/users/:id/', ({ params }) => {
    const user = testUsers.find(u => u.id === params.id);
    if (user) {
      return HttpResponse.json(user);
    }
    return HttpResponse.json(
      { detail: 'Not found' },
      { status: 404 }
    );
  }),

  // Service endpoints
  http.get('/api/services/', () => {
    return HttpResponse.json({
      count: testServices.length,
      results: testServices,
    });
  }),

  http.get('/api/services/:id/', ({ params }) => {
    const service = testServices.find(s => s.id === params.id);
    if (service) {
      return HttpResponse.json(service);
    }
    return HttpResponse.json(
      { detail: 'Not found' },
      { status: 404 }
    );
  }),

  http.post('/api/services/', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      id: 'new-service-id',
      ...body,
      created_at: new Date().toISOString(),
    }, { status: 201 });
  }),
];
