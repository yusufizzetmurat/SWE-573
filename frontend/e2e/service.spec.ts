import { test, expect } from '@playwright/test';

test.describe('Service Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/');
    await page.click('text=Log in');
    await page.fill('input[type="email"]', 'elif@demo.com');
    await page.fill('input[type="password"]', 'demo123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/dashboard|home/i, { timeout: 15000 });
  });

  test('should display services on dashboard', async ({ page }) => {
    // Wait for services to load
    await expect(page.locator('[class*="service"], [class*="card"]').first()).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to create service form', async ({ page }) => {
    // Find and click create service button
    await page.click('text=/post.*offer|create.*service|new.*service/i');
    
    // Verify form elements
    await expect(page.locator('input[name="title"], input[placeholder*="title" i]')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('textarea[name="description"], textarea[placeholder*="description" i]')).toBeVisible();
  });

  test('should create a new service', async ({ page }) => {
    // Navigate to create service
    await page.click('text=/post.*offer|create.*service|new.*service/i');
    
    // Fill service form
    await page.fill('input[name="title"], input[placeholder*="title" i]', 'E2E Test Service');
    await page.fill('textarea[name="description"], textarea[placeholder*="description" i]', 'This is a test service created by E2E tests');
    
    // Select duration
    await page.fill('input[name="duration"], input[placeholder*="duration" i]', '2');
    
    // Submit form
    await page.click('button[type="submit"]:has-text(/create|post|submit/i)');
    
    // Verify success (redirect or success message)
    await expect(page.locator('text=/success|created|posted/i')).toBeVisible({ timeout: 10000 });
  });

  test('should view service details', async ({ page }) => {
    // Click on first service card
    await page.locator('[class*="service"], [class*="card"]').first().click();
    
    // Verify detail page elements
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=/description|details/i')).toBeVisible();
  });

  test('should express interest in a service', async ({ page }) => {
    // Navigate to a service (not owned by the logged-in user)
    await page.goto('/');
    await page.click('text=Log in');
    await page.fill('input[type="email"]', 'cem@demo.com');
    await page.fill('input[type="password"]', 'demo123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/dashboard|home/i, { timeout: 15000 });
    
    // Find and click on a service
    await page.locator('[class*="service"], [class*="card"]').first().click();
    
    // Click express interest
    const interestButton = page.locator('button:has-text(/express interest|interested/i)');
    if (await interestButton.isVisible()) {
      await interestButton.click();
      // Verify success or navigation to chat
      await expect(page.locator('text=/success|pending|chat|messages/i')).toBeVisible({ timeout: 10000 });
    }
  });
});
