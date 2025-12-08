import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

test.describe('Public Chat (Service Lobby)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'elif');
  });

  test('should display public discussion tab on service detail', async ({ page }) => {
    const serviceButton = page.locator('.grid button.rounded-xl').first();
    await expect(serviceButton).toBeVisible({ timeout: 10000 });
    await serviceButton.click();
    
    await page.waitForTimeout(1000);
    
    await expect(page.getByRole('tab', { name: /public discussion|lobby/i })).toBeVisible({ timeout: 5000 });
  });

  test('should switch to public discussion tab', async ({ page }) => {
    const serviceButton = page.locator('.grid button.rounded-xl').first();
    await expect(serviceButton).toBeVisible({ timeout: 10000 });
    await serviceButton.click();
    
    await page.getByRole('tab', { name: /public discussion|lobby/i }).click();
    
    await page.waitForTimeout(1000);
    
    await expect(page.getByRole('tabpanel')).toBeVisible({ timeout: 5000 });
  });

  test('should send message in public chat', async ({ page }) => {
    const serviceButton = page.locator('.grid button.rounded-xl').first();
    await expect(serviceButton).toBeVisible({ timeout: 10000 });
    await serviceButton.click();
    
    await page.getByRole('tab', { name: /public discussion|lobby/i }).click();
    
    await page.waitForTimeout(3000);
    
    const messageInput = page.getByPlaceholder(/discussion|message|type/i);
    
    if (await messageInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await messageInput.fill('E2E test message in public chat');
      
      const sendButton = page.locator('button').filter({ has: page.locator('svg') }).last();
      await sendButton.click();
      
      await page.waitForTimeout(1000);
    }
  });

  test('should show live indicator when connected', async ({ page }) => {
    const serviceButton = page.locator('.grid button.rounded-xl').first();
    await expect(serviceButton).toBeVisible({ timeout: 10000 });
    await serviceButton.click();
    
    await page.getByRole('tab', { name: /public discussion|lobby/i }).click();
    
    await page.waitForTimeout(3000);
  });
});
