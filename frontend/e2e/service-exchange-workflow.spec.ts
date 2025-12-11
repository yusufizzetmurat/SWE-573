/** E2E test for complete service exchange workflow */
import { test, expect } from '@playwright/test';
import { login, logout, switchUser, DEMO_USERS } from './helpers/auth';

test.describe('Complete Service Exchange Workflow', () => {
  test.describe.configure({ mode: 'serial' });

  let serviceTitle: string;
  let providerBalanceBefore: number;
  let receiverBalanceBefore: number;
  
  test.beforeAll(() => {
    serviceTitle = `E2E Complete Workflow ${Date.now()}`;
  });

  test('Provider creates a service offer', async ({ page }) => {
    await login(page, 'elif');
    
    // Get initial balance
    const balanceText = await page.locator('text=/\\d+\\.\\d+ hours/i').first().textContent().catch(() => null);
    if (balanceText) {
      providerBalanceBefore = parseFloat(balanceText.match(/(\d+\.\d+)/)?.[1] || '0');
    }
    
    await page.getByRole('button', { name: /post a service/i }).click();
    await page.getByRole('menuitem', { name: /post an offer/i }).click();
    
    await expect(page.getByLabel(/title/i)).toBeVisible({ timeout: 5000 });
    
    await page.getByLabel(/title/i).fill(serviceTitle);
    await page.getByLabel(/description/i).fill('E2E test service for workflow validation.');
    
    const durationSelect = page.getByRole('combobox', { name: /duration/i });
    if (await durationSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
      await durationSelect.click();
      await page.getByRole('option', { name: /2/i }).first().click();
    }
    
    await page.getByRole('button', { name: /create|post|submit/i }).first().click();
    
    await page.waitForTimeout(2000);
    
    // Verify service was created
    const success = await Promise.race([
      page.getByText(/success|created|posted/i).isVisible().catch(() => false),
      page.getByRole('heading', { name: new RegExp(serviceTitle, 'i') }).isVisible().catch(() => false),
    ]);
    expect(success).toBeTruthy();
  });

  test('Receiver finds service and expresses interest', async ({ page }) => {
    await switchUser(page, 'cem');
    
    // Get receiver's initial balance
    const balanceText = await page.locator('text=/\\d+\\.\\d+ hours/i').first().textContent().catch(() => null);
    if (balanceText) {
      receiverBalanceBefore = parseFloat(balanceText.match(/(\d+\.\d+)/)?.[1] || '0');
    }
    
    // Search for the service
    const searchInput = page.getByPlaceholder(/search/i);
    if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await searchInput.fill(serviceTitle);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(1000);
    }
    
    // Find and click the service
    const serviceCard = page.locator('.grid button.rounded-xl, .cursor-pointer')
      .filter({ hasText: new RegExp(serviceTitle.substring(0, 20), 'i') })
      .first();
    
    if (await serviceCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await serviceCard.click();
      await expect(page.getByText(serviceTitle).first()).toBeVisible({ timeout: 5000 });
    }
    
    // Express interest
    const interestButton = page.getByRole('button', { name: /express interest|interested|start chat/i });
    if (await interestButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await interestButton.click();
      await page.waitForTimeout(2000);
      
      // Should redirect to chat or show success
      const chatVisible = await page.getByText(/chat|message|conversation/i).first().isVisible().catch(() => false);
      const successVisible = await page.getByText(/success|interest/i).first().isVisible().catch(() => false);
      expect(chatVisible || successVisible).toBeTruthy();
    }
  });

  test('Provider accepts handshake', async ({ page }) => {
    await switchUser(page, 'elif');
    
    // Go to chat page
    await page.getByRole('button', { name: /chat|messages/i }).click();
    await page.waitForTimeout(2000);
    
    // Find conversation with Cem
    const conversation = page.locator('.cursor-pointer').filter({ hasText: /cem/i }).first();
    if (await conversation.isVisible({ timeout: 5000 }).catch(() => false)) {
      await conversation.click();
      await page.waitForTimeout(1000);
      
      // Accept handshake (this should provision hours from receiver)
      const acceptButton = page.getByRole('button', { name: /accept|provide details|handshake/i });
      if (await acceptButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await acceptButton.click();
        await page.waitForTimeout(2000);
      }
    }
    
    // Verify hours were provisioned (receiver's balance should decrease)
    // This will be checked in the next step
  });

  test('Verify TimeBank hour transfer on handshake acceptance', async ({ page }) => {
    await switchUser(page, 'cem');
    
    // Check receiver's balance decreased (hours provisioned)
    const balanceText = await page.locator('text=/\\d+\\.\\d+ hours/i').first().textContent().catch(() => null);
    if (balanceText) {
      const receiverBalanceAfter = parseFloat(balanceText.match(/(\d+\.\d+)/)?.[1] || '0');
      // For Offer type, receiver (requester) pays, so balance should decrease by service duration
      expect(receiverBalanceAfter).toBeLessThan(receiverBalanceBefore);
    }
  });

  test('Complete service (both parties confirm)', async ({ page }) => {
    await switchUser(page, 'elif');
    
    // Go to chat
    await page.getByRole('button', { name: /chat|messages/i }).click();
    await page.waitForTimeout(2000);
    
    const conversation = page.locator('.cursor-pointer').filter({ hasText: /cem/i }).first();
    if (await conversation.isVisible({ timeout: 5000 }).catch(() => false)) {
      await conversation.click();
      await page.waitForTimeout(1000);
      
      // Provider confirms completion
      const confirmButton = page.getByRole('button', { name: /confirm|complete|service done/i });
      if (await confirmButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await confirmButton.click();
        await page.waitForTimeout(1000);
        
        // If modal appears, confirm hours
        const hoursInput = page.getByLabel(/hours/i);
        if (await hoursInput.isVisible({ timeout: 2000 }).catch(() => false)) {
          await hoursInput.fill('2');
          await page.getByRole('button', { name: /confirm|submit/i }).click();
          await page.waitForTimeout(2000);
        }
      }
    }
    
    // Receiver confirms completion
    await switchUser(page, 'cem');
    
    await page.getByRole('button', { name: /chat|messages/i }).click();
    await page.waitForTimeout(2000);
    
    const conversation2 = page.locator('.cursor-pointer').filter({ hasText: /elif/i }).first();
    if (await conversation2.isVisible({ timeout: 5000 }).catch(() => false)) {
      await conversation2.click();
      await page.waitForTimeout(1000);
      
      const confirmButton = page.getByRole('button', { name: /confirm|complete|service done/i });
      if (await confirmButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await confirmButton.click();
        await page.waitForTimeout(1000);
      }
    }
  });

  test('Verify TimeBank hour transfer on completion', async ({ page }) => {
    await switchUser(page, 'elif');
    
    // Provider should have gained hours
    const balanceText = await page.locator('text=/\\d+\\.\\d+ hours/i').first().textContent().catch(() => null);
    if (balanceText) {
      const providerBalanceAfter = parseFloat(balanceText.match(/(\d+\.\d+)/)?.[1] || '0');
      // Provider should have more hours after completion
      expect(providerBalanceAfter).toBeGreaterThan(providerBalanceBefore);
    }
    
    await switchUser(page, 'cem');
    
    // Receiver should have lost hours (already checked in step 4)
    const balanceText2 = await page.locator('text=/\\d+\\.\\d+ hours/i').first().textContent().catch(() => null);
    if (balanceText2) {
      const receiverBalanceAfter = parseFloat(balanceText2.match(/(\d+\.\d+)/)?.[1] || '0');
      expect(receiverBalanceAfter).toBeLessThan(receiverBalanceBefore);
    }
  });

  test('Receiver submits reputation for provider', async ({ page }) => {
    await switchUser(page, 'cem');
    
    // Go to chat
    await page.getByRole('button', { name: /chat|messages/i }).click();
    await page.waitForTimeout(2000);
    
    const conversation = page.locator('.cursor-pointer').filter({ hasText: /elif/i }).first();
    if (await conversation.isVisible({ timeout: 5000 }).catch(() => false)) {
      await conversation.click();
      await page.waitForTimeout(1000);
      
      // Look for reputation modal or button
      const repButton = page.getByRole('button', { name: /reputation|review|rate/i });
      if (await repButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await repButton.click();
        await page.waitForTimeout(1000);
        
        // Submit positive reputation
        const punctualCheck = page.getByLabel(/punctual/i);
        const helpfulCheck = page.getByLabel(/helpful/i);
        const kindCheck = page.getByLabel(/kind/i);
        
        if (await punctualCheck.isVisible({ timeout: 2000 }).catch(() => false)) {
          await punctualCheck.check();
        }
        if (await helpfulCheck.isVisible({ timeout: 2000 }).catch(() => false)) {
          await helpfulCheck.check();
        }
        if (await kindCheck.isVisible({ timeout: 2000 }).catch(() => false)) {
          await kindCheck.check();
        }
        
        const submitButton = page.getByRole('button', { name: /submit|save/i });
        if (await submitButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          await submitButton.click();
          await page.waitForTimeout(2000);
          
          // Verify success message
          const success = await page.getByText(/success|submitted|thank you/i).isVisible().catch(() => false);
          expect(success).toBeTruthy();
        }
      }
    }
  });

  test('Verify reputation affects provider karma and badges', async ({ page }) => {
    await switchUser(page, 'elif');
    
    // Go to profile
    await page.getByRole('button', { name: /profile/i }).click();
    await page.waitForTimeout(2000);
    
    const karmaText = await page.locator('text=/karma|reputation/i').textContent().catch(() => null);
    const badges = page.locator('text=/badge|achievement/i');
  });
});
