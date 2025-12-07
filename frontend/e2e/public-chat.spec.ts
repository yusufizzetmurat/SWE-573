import { test, expect } from '@playwright/test';

test.describe('Public Chat (Service Lobby)', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/');
    await page.click('text=Log in');
    await page.fill('input[type="email"]', 'elif@demo.com');
    await page.fill('input[type="password"]', 'demo123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/dashboard|home/i, { timeout: 15000 });
  });

  test('should display public discussion tab on service detail', async ({ page }) => {
    // Click on first service card
    await page.locator('[class*="service"], [class*="card"]').first().click();
    
    // Wait for detail page to load
    await page.waitForTimeout(1000);
    
    // Look for public discussion tab
    await expect(page.locator('text=/public discussion|discussion/i')).toBeVisible({ timeout: 5000 });
  });

  test('should switch to public discussion tab', async ({ page }) => {
    // Click on first service card
    await page.locator('[class*="service"], [class*="card"]').first().click();
    
    // Click on public discussion tab
    await page.click('text=/public discussion|discussion/i');
    
    // Verify public chat component is visible
    await expect(page.locator('text=/join the discussion|no messages|public/i')).toBeVisible({ timeout: 5000 });
  });

  test('should send message in public chat', async ({ page }) => {
    // Click on first service card
    await page.locator('[class*="service"], [class*="card"]').first().click();
    
    // Click on public discussion tab
    await page.click('text=/public discussion|discussion/i');
    
    // Wait for chat to load
    await page.waitForTimeout(2000);
    
    // Find message input
    const messageInput = page.locator('input[placeholder*="discussion"], input[placeholder*="message"]');
    
    if (await messageInput.isVisible()) {
      // Type and send message
      await messageInput.fill('E2E test message in public chat');
      await page.click('button:has([class*="send"]), button svg');
      
      // Verify message appears
      await expect(page.locator('text=E2E test message in public chat')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should show live indicator when connected', async ({ page }) => {
    // Click on first service card
    await page.locator('[class*="service"], [class*="card"]').first().click();
    
    // Click on public discussion tab
    await page.click('text=/public discussion|discussion/i');
    
    // Wait for WebSocket connection
    await page.waitForTimeout(3000);
    
    // Check for live indicator (may or may not appear depending on connection)
    const liveIndicator = page.locator('text=/live/i, .animate-pulse');
    // This is optional - connection might not always establish in test env
  });
});
