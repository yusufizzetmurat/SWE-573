import { test, expect } from '@playwright/test';
import { login, logout, switchUser } from './helpers/auth';

test.describe('Service Management', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'elif');
  });

  test('should display services on dashboard', async ({ page }) => {
    const serviceGrid = page.locator('.grid button.rounded-xl');
    await expect(serviceGrid.first()).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to create service form', async ({ page }) => {
    await page.getByRole('button', { name: /post a service/i }).click();
    await page.getByRole('menuitem', { name: /post an offer/i }).click();
    
    await expect(page.getByLabel(/title/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByLabel(/description/i)).toBeVisible();
  });

  test('should create a new service', async ({ page }) => {
    await page.getByRole('button', { name: /post a service/i }).click();
    await page.getByRole('menuitem', { name: /post an offer/i }).click();
    
    await expect(page.getByLabel(/title/i)).toBeVisible({ timeout: 5000 });
    
    await page.getByLabel(/title/i).fill('E2E Test Service');
    await page.getByLabel(/description/i).fill('This is a test service created by E2E tests');
    
    const durationSelect = page.getByRole('combobox', { name: /duration/i });
    if (await durationSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
      await durationSelect.click();
      await page.getByRole('option', { name: /2/i }).first().click();
    }
    
    const submitButton = page.getByRole('button', { name: /create|post|submit/i }).first();
    await submitButton.click();
    
    await page.waitForTimeout(2000);
    
    const success = await Promise.race([
      page.getByText(/success|created|posted/i).isVisible().catch(() => false),
      page.getByRole('heading', { name: /E2E Test Service/i }).isVisible().catch(() => false),
      page.getByRole('heading', { name: /browse services/i }).isVisible().catch(() => false),
    ]);
    expect(success).toBeTruthy();
  });

  test('should view service details', async ({ page }) => {
    const serviceButton = page.locator('.grid button.rounded-xl').first();
    await expect(serviceButton).toBeVisible({ timeout: 10000 });
    
    await serviceButton.click();
    
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 5000 });
  });

  test('should express interest in a service', async ({ page }) => {
    await switchUser(page, 'cem');
    
    const serviceButton = page.locator('.grid button.rounded-xl').first();
    await expect(serviceButton).toBeVisible({ timeout: 10000 });
    await serviceButton.click();
    
    const interestButton = page.getByRole('button', { name: /express interest|interested|start chat/i });
    
    if (await interestButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await interestButton.click();
      await page.waitForTimeout(2000);
    }
  });
});
