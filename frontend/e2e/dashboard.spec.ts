import { test, expect } from '@playwright/test';

const mockUser = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'member@example.com',
  first_name: 'Test',
  last_name: 'Member',
  timebank_balance: 5,
  karma_score: 0,
  role: 'member' as const,
  badges: [],
  services: [],
  punctual_count: 0,
  helpful_count: 0,
  kind_count: 0,
  date_joined: new Date().toISOString(),
};

const mockServices = [
  {
    id: 'service-1',
    title: 'Community Gardening',
    description: 'Learn how to grow vegetables in small spaces.',
    type: 'Offer' as const,
    duration: 2,
    location_type: 'Online' as const,
    status: 'Active' as const,
    max_participants: 5,
    schedule_type: 'One-Time' as const,
    schedule_details: 'Nov 15, 2025 10:00',
    created_at: new Date().toISOString(),
    tags: [{ id: 'gardening', name: 'gardening' }],
    user: mockUser,
  },
  {
    id: 'service-2',
    title: 'Guitar Basics Workshop',
    description: 'Beginner-friendly guitar lesson.',
    type: 'Need' as const,
    duration: 1,
    location_type: 'In-Person' as const,
    status: 'Active' as const,
    max_participants: 3,
    schedule_type: 'Recurrent' as const,
    schedule_details: 'Every Saturday',
    created_at: new Date().toISOString(),
    tags: [{ id: 'music', name: 'music' }],
    user: mockUser,
  },
];

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(({ accessToken, refreshToken, userData }) => {
      localStorage.setItem('access_token', accessToken);
      localStorage.setItem('refresh_token', refreshToken);
      localStorage.setItem('user_data', JSON.stringify(userData));
    }, {
      accessToken: 'mock-token',
      refreshToken: 'mock-refresh-token',
      userData: mockUser,
    });

    await page.route('**/api/services/**', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockServices) });
      } else {
        route.continue();
      }
    });

    await page.route('**/api/notifications/**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });

    await page.route('**/api/users/me/**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockUser) });
    });

    await page.goto('/dashboard');
  });

  test('should display dashboard after login', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'Browse Services' })).toBeVisible();
  });

  test('should filter services', async ({ page }) => {
    const onlineFilter = page.getByRole('button', { name: 'Online Only' });
    await onlineFilter.click();
    await expect(onlineFilter).toHaveClass(/bg-amber-500/);
  });

  test('should navigate to service detail', async ({ page }) => {
    const serviceCard = page.getByRole('button', { name: /Community Gardening/i });
    await expect(serviceCard).toBeVisible();
    await serviceCard.click();
    await expect(page).toHaveURL(/.*service-detail/);
  });
});

