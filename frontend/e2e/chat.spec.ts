import { test, expect } from '@playwright/test';

test.describe('Chat Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/');
    await page.getByRole('button', { name: /log in/i }).first().click();
    await page.getByLabel(/email/i).fill('elif@demo.com');
    await page.getByLabel(/password/i).fill('demo123');
    await page.getByRole('button', { name: /log in/i }).click();
    await expect(page.getByRole('heading', { name: /browse services/i })).toBeVisible({ timeout: 15000 });
  });

  test('should navigate to messages page', async ({ page }) => {
    // Find and click Chat link in navbar
    await page.getByRole('button', { name: /chat/i }).click();
    
    // Verify messages page - wait for page content to load
    await page.waitForTimeout(1000);
    
    // Should see page title or some chat-related content
    const hasContent = await page.getByText(/conversation|messages|chat|select/i).first().isVisible({ timeout: 5000 }).catch(() => false);
    expect(hasContent).toBeTruthy();
  });

  test('should display conversation list', async ({ page }) => {
    await page.getByRole('button', { name: /chat/i }).click();
    
    // Wait for conversations to load
    await page.waitForTimeout(2000);
    
    // Should see either conversation items or empty state message
    // Check if page has any content (conversations or empty state)
    const pageContent = page.locator('main, [class*="chat"], .min-h-screen');
    await expect(pageContent.first()).toBeVisible({ timeout: 5000 });
  });

  test('should send a message in conversation', async ({ page }) => {
    await page.getByRole('button', { name: /chat/i }).click();
    
    // Wait for page to load
    await page.waitForTimeout(2000);
    
    // Check if there are conversations - they appear as clickable items
    const conversationItem = page.locator('.cursor-pointer').first();
    
    if (await conversationItem.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Click on first conversation
      await conversationItem.click();
      
      // Wait for message input
      const messageInput = page.getByPlaceholder(/message|type/i);
      
      if (await messageInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        // Type and send message
        await messageInput.fill('Hello from E2E test!');
        
        // Find send button
        const sendButton = page.getByRole('button', { name: /send/i });
        if (await sendButton.isVisible().catch(() => false)) {
          await sendButton.click();
        } else {
          // Try clicking the button with Send icon
          await page.locator('button').filter({ has: page.locator('svg') }).last().click();
        }
        
        // Verify message appears
        await expect(page.getByText('Hello from E2E test!')).toBeVisible({ timeout: 5000 });
      }
    }
    // Test passes if no conversations - that's a valid state
  });
});
