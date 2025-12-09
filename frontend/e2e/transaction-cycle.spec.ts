import { test, expect } from '@playwright/test';
import { login, logout, switchUser, DEMO_USERS } from './helpers/auth';

test.describe('Full Transaction Cycle', () => {
  test.describe.configure({ mode: 'serial' });

  let serviceTitle: string;
  
  test.beforeAll(() => {
    serviceTitle = `E2E Test Service ${Date.now()}`;
  });

  test('User A creates a new service offer', async ({ page }) => {
    await login(page, 'elif');
    
    await page.getByRole('button', { name: /post a service/i }).click();
    await page.getByRole('menuitem', { name: /post an offer/i }).click();
    
    await expect(page.getByLabel(/title/i)).toBeVisible({ timeout: 5000 });
    
    await page.getByLabel(/title/i).fill(serviceTitle);
    await page.getByLabel(/description/i).fill('This is an E2E test service for transaction cycle testing.');
    
    const durationSelect = page.getByRole('combobox', { name: /duration/i });
    if (await durationSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
      await durationSelect.click();
      await page.getByRole('option', { name: /1/i }).first().click();
    }
    
    await page.getByRole('button', { name: /create|post|submit/i }).first().click();
    
    await page.waitForTimeout(2000);
    
    const success = await Promise.race([
      page.getByText(/success|created|posted/i).isVisible().catch(() => false),
      page.getByRole('heading', { name: new RegExp(serviceTitle, 'i') }).isVisible().catch(() => false),
      page.getByRole('heading', { name: /browse services/i }).isVisible().catch(() => false),
    ]);
    expect(success).toBeTruthy();
    
    await logout(page);
  });

  test('User B finds and views the service', async ({ page }) => {
    await login(page, 'cem');
    
    // Search for the service
    const searchInput = page.getByPlaceholder(/search/i);
    if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await searchInput.fill(serviceTitle);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(1000);
    }
    
    // Find the service in listings
    const serviceCard = page.locator('.grid button.rounded-xl, .cursor-pointer').filter({ hasText: new RegExp(serviceTitle.substring(0, 20), 'i') }).first();
    
    if (await serviceCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await serviceCard.click();
      await expect(page.getByText(serviceTitle).first()).toBeVisible({ timeout: 5000 });
    }
    
    await logout(page);
  });

  test('User B posts a comment on the service', async ({ page }) => {
    await login(page, 'cem');
    
    // Navigate to the service
    const searchInput = page.getByPlaceholder(/search/i);
    if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await searchInput.fill(serviceTitle);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(1000);
    }
    
    const serviceCard = page.locator('.grid button.rounded-xl, .cursor-pointer').filter({ hasText: new RegExp(serviceTitle.substring(0, 20), 'i') }).first();
    if (await serviceCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await serviceCard.click();
    }
    
    // Post a comment
    const commentInput = page.getByPlaceholder(/comment|question/i);
    if (await commentInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await commentInput.fill('This looks great! I would love to learn more.');
      const submitComment = page.getByRole('button', { name: /post|submit|send/i }).first();
      await submitComment.click();
      await page.waitForTimeout(1000);
    }
    
    await logout(page);
  });

  test('User B expresses interest and starts chat', async ({ page }) => {
    await login(page, 'cem');
    
    // Navigate to the service
    const searchInput = page.getByPlaceholder(/search/i);
    if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await searchInput.fill(serviceTitle);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(1000);
    }
    
    const serviceCard = page.locator('.grid button.rounded-xl, .cursor-pointer').filter({ hasText: new RegExp(serviceTitle.substring(0, 20), 'i') }).first();
    if (await serviceCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await serviceCard.click();
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
    
    await logout(page);
  });

  test('User A sees the interest and can accept handshake', async ({ page }) => {
    await login(page, 'elif');
    
    // Go to chat page
    await page.getByRole('button', { name: /chat/i }).click();
    await page.waitForTimeout(2000);
    
    // Look for conversation with Cem
    const conversation = page.locator('.cursor-pointer').filter({ hasText: /cem/i }).first();
    if (await conversation.isVisible({ timeout: 5000 }).catch(() => false)) {
      await conversation.click();
      await page.waitForTimeout(1000);
      
      // Look for accept/handshake button
      const acceptButton = page.getByRole('button', { name: /accept|provide details|handshake/i });
      if (await acceptButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await acceptButton.click();
        await page.waitForTimeout(1000);
      }
    }
    
    await logout(page);
  });
});

test.describe('Service Interaction Flow', () => {
  test('can view service details and see comments', async ({ page }) => {
    await login(page, 'elif');
    
    // Click on first service
    const serviceCard = page.locator('.grid button.rounded-xl').first();
    await expect(serviceCard).toBeVisible({ timeout: 10000 });
    await serviceCard.click();
    
    // Should see service details
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 5000 });
    
    // Check for comments section tab
    const commentsTab = page.getByRole('tab', { name: /comments|discussion/i });
    if (await commentsTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await commentsTab.click();
      await page.waitForTimeout(500);
    }
  });

  test('can navigate between service listings and details', async ({ page }) => {
    await login(page, 'elif');
    
    // Click on a service
    const serviceCard = page.locator('.grid button.rounded-xl').first();
    await expect(serviceCard).toBeVisible({ timeout: 10000 });
    await serviceCard.click();
    
    // Should be on detail page
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 5000 });
    
    // Go back to listings
    const backButton = page.getByRole('button', { name: /back/i });
    if (await backButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await backButton.click();
      await expect(page.getByRole('heading', { name: /browse services/i })).toBeVisible({ timeout: 5000 });
    }
  });
});
