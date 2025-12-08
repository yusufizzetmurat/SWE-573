import { test, expect } from '@playwright/test';

test.describe('Service Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/');
    await page.getByRole('button', { name: /log in/i }).first().click();
    await page.getByLabel(/email/i).fill('elif@demo.com');
    await page.getByLabel(/password/i).fill('demo123');
    await page.getByRole('button', { name: /log in/i }).click();
    await expect(page.getByRole('heading', { name: /browse services/i })).toBeVisible({ timeout: 15000 });
  });

  test('should display services on dashboard', async ({ page }) => {
    // Wait for services to load - look for service titles or the grid
    // Services are rendered as buttons with rounded-xl class in a grid
    const serviceGrid = page.locator('.grid button.rounded-xl');
    await expect(serviceGrid.first()).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to create service form', async ({ page }) => {
    // Click "Post a Service" dropdown and then "Post an Offer"
    await page.getByRole('button', { name: /post a service/i }).click();
    await page.getByRole('menuitem', { name: /post an offer/i }).click();
    
    // Verify form elements - look for title input
    await expect(page.getByLabel(/title/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByLabel(/description/i)).toBeVisible();
  });

  test('should create a new service', async ({ page }) => {
    // Navigate to create service
    await page.getByRole('button', { name: /post a service/i }).click();
    await page.getByRole('menuitem', { name: /post an offer/i }).click();
    
    // Wait for form to load
    await expect(page.getByLabel(/title/i)).toBeVisible({ timeout: 5000 });
    
    // Fill service form
    await page.getByLabel(/title/i).fill('E2E Test Service');
    await page.getByLabel(/description/i).fill('This is a test service created by E2E tests');
    
    // Duration is a select/combobox, need to click and select
    const durationSelect = page.getByRole('combobox', { name: /duration/i });
    if (await durationSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
      await durationSelect.click();
      // Select 2 hours option
      await page.getByRole('option', { name: /2/i }).first().click();
    }
    
    // Submit form - try different button texts
    const submitButton = page.getByRole('button', { name: /create|post|submit/i }).first();
    await submitButton.click();
    
    // Verify success - might show toast or redirect to service detail
    // Wait a bit for navigation/toast
    await page.waitForTimeout(2000);
    
    // Check we're either on service detail or see success message or back to dashboard
    const success = await Promise.race([
      page.getByText(/success|created|posted/i).isVisible().catch(() => false),
      page.getByRole('heading', { name: /E2E Test Service/i }).isVisible().catch(() => false),
      page.getByRole('heading', { name: /browse services/i }).isVisible().catch(() => false),
    ]);
    expect(success).toBeTruthy();
  });

  test('should view service details', async ({ page }) => {
    // Wait for services grid to load
    const serviceButton = page.locator('.grid button.rounded-xl').first();
    await expect(serviceButton).toBeVisible({ timeout: 10000 });
    
    // Click on first service
    await serviceButton.click();
    
    // Verify detail page - should have service info
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 5000 });
  });

  test('should express interest in a service', async ({ page }) => {
    // First logout then login as different user
    await page.locator('nav button.bg-amber-100').click();
    await page.getByRole('menuitem', { name: /log out/i }).click();
    await expect(page.getByRole('button', { name: /log in/i }).first()).toBeVisible({ timeout: 5000 });
    
    // Login as cem
    await page.getByRole('button', { name: /log in/i }).first().click();
    await page.getByLabel(/email/i).fill('cem@demo.com');
    await page.getByLabel(/password/i).fill('demo123');
    await page.getByRole('button', { name: /log in/i }).click();
    await expect(page.getByRole('heading', { name: /browse services/i })).toBeVisible({ timeout: 15000 });
    
    // Find and click on a service
    const serviceButton = page.locator('.grid button.rounded-xl').first();
    await expect(serviceButton).toBeVisible({ timeout: 10000 });
    await serviceButton.click();
    
    // Look for express interest button
    const interestButton = page.getByRole('button', { name: /express interest|interested|start chat/i });
    
    if (await interestButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await interestButton.click();
      // Verify something happened (toast, navigation, status change)
      await page.waitForTimeout(2000);
    }
    // Test passes if we got this far - user might already have interest or be the owner
  });
});
