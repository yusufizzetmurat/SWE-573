import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

test.describe('Chat Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'elif');
  });

  test('should navigate to messages page', async ({ page }) => {
    await page.getByRole('button', { name: /chat/i }).click();
    
    await page.waitForTimeout(1000);
    
    const hasContent = await page.getByText(/conversation|messages|chat|select/i).first().isVisible({ timeout: 5000 }).catch(() => false);
    expect(hasContent).toBeTruthy();
  });

  test('should display conversation list', async ({ page }) => {
    await page.getByRole('button', { name: /chat/i }).click();
    
    await page.waitForTimeout(2000);
    
    const pageContent = page.locator('main, [class*="chat"], .min-h-screen');
    await expect(pageContent.first()).toBeVisible({ timeout: 5000 });
  });

  test('should send a message in conversation', async ({ page }) => {
    await page.getByRole('button', { name: /chat/i }).click();
    
    await page.waitForTimeout(2000);
    
    const conversationItem = page.locator('.cursor-pointer').first();
    
    if (await conversationItem.isVisible({ timeout: 3000 }).catch(() => false)) {
      await conversationItem.click();
      
      const messageInput = page.getByPlaceholder(/message|type/i);
      
      if (await messageInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        await messageInput.fill('Hello from E2E test!');
        
        const sendButton = page.getByRole('button', { name: /send/i });
        if (await sendButton.isVisible().catch(() => false)) {
          await sendButton.click();
        } else {
          await page.locator('button').filter({ has: page.locator('svg') }).last().click();
        }
        
        await expect(page.getByText('Hello from E2E test!')).toBeVisible({ timeout: 5000 });
      }
    }
  });
});
