import { test, expect } from '@playwright/test';

test.describe('Chat Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/');
    await page.click('text=Log in');
    await page.fill('input[type="email"]', 'elif@demo.com');
    await page.fill('input[type="password"]', 'demo123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/dashboard|home/i, { timeout: 15000 });
  });

  test('should navigate to messages page', async ({ page }) => {
    // Find and click messages link
    await page.click('text=/messages|chat/i');
    
    // Verify messages page
    await expect(page.locator('text=/conversation|messages|chat/i')).toBeVisible({ timeout: 10000 });
  });

  test('should display conversation list', async ({ page }) => {
    await page.click('text=/messages|chat/i');
    
    // Wait for conversations to load (might be empty or have items)
    await expect(page.locator('[class*="conversation"], [class*="chat"], text=/no conversation|select/i')).toBeVisible({ timeout: 10000 });
  });

  test('should send a message in conversation', async ({ page }) => {
    await page.click('text=/messages|chat/i');
    
    // Wait for page to load
    await page.waitForTimeout(2000);
    
    // Check if there are conversations
    const conversationItem = page.locator('[class*="conversation"], [class*="chat-item"]').first();
    
    if (await conversationItem.isVisible()) {
      // Click on first conversation
      await conversationItem.click();
      
      // Wait for message input
      const messageInput = page.locator('input[placeholder*="message"], textarea[placeholder*="message"]');
      await expect(messageInput).toBeVisible({ timeout: 5000 });
      
      // Type and send message
      await messageInput.fill('Hello from E2E test!');
      await page.click('button:has-text(/send/i), button[type="submit"]');
      
      // Verify message appears
      await expect(page.locator('text=Hello from E2E test!')).toBeVisible({ timeout: 5000 });
    }
  });
});
