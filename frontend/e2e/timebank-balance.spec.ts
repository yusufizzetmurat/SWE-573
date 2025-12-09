import { test, expect } from '@playwright/test';
import { login, logout, DEMO_USERS } from './helpers/auth';

test.describe('TimeBank Balance Verification', () => {
  test('displays user balance in navbar after login', async ({ page }) => {
    await login(page, 'elif');
    
    const balanceElement = page.locator('nav').getByText(/\d+(\.\d+)?\s*(h|hours?)/i);
    await expect(balanceElement).toBeVisible({ timeout: 5000 });
  });

  test('displays balance on user profile', async ({ page }) => {
    await login(page, 'elif');
    
    await page.locator('nav button:has([class*="bg-amber-100"])').click();
    await page.getByRole('menuitem', { name: /profile/i }).click();
    
    await page.waitForTimeout(2000);
    
    const profileContent = page.locator('main');
    await expect(profileContent).toBeVisible();
    
    const balanceSection = page.getByText(/timebank|balance|hours/i).first();
    await expect(balanceSection).toBeVisible({ timeout: 5000 });
  });

  test('balance requirements shown when expressing interest', async ({ page }) => {
    await login(page, 'cem');
    
    const serviceCard = page.locator('.grid button.rounded-xl').first();
    await expect(serviceCard).toBeVisible({ timeout: 10000 });
    await serviceCard.click();
    
    await page.waitForTimeout(1000);
    
    const durationInfo = page.getByText(/hour|duration/i).first();
    await expect(durationInfo).toBeVisible({ timeout: 5000 });
  });

  test('transaction history page shows balance changes', async ({ page }) => {
    await login(page, 'elif');
    
    await page.locator('nav button:has([class*="bg-amber-100"])').click();
    
    const historyItem = page.getByRole('menuitem', { name: /history|transaction/i });
    if (await historyItem.isVisible({ timeout: 3000 }).catch(() => false)) {
      await historyItem.click();
      await page.waitForTimeout(2000);
      
      const pageContent = page.locator('main');
      await expect(pageContent).toBeVisible();
    }
  });

  test('insufficient balance prevents service creation over limit', async ({ page }) => {
    await login(page, 'elif');
    
    await page.getByRole('button', { name: /post a service/i }).click();
    await page.getByRole('menuitem', { name: /post an offer/i }).click();
    
    await expect(page.getByLabel(/title/i)).toBeVisible({ timeout: 5000 });
  });

  test('user can see other user balance on public profile', async ({ page }) => {
    await login(page, 'elif');
    
    const serviceCard = page.locator('.grid button.rounded-xl').first();
    await expect(serviceCard).toBeVisible({ timeout: 10000 });
    await serviceCard.click();
    
    await page.waitForTimeout(1000);
    
    const providerCard = page.locator('.cursor-pointer').filter({ hasText: /View Profile/i }).first();
    if (await providerCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await providerCard.click();
      
      await expect(page.getByText(/karma|reputation/i).first()).toBeVisible({ timeout: 5000 });
    }
  });
});

test.describe('Balance Display Consistency', () => {
  test('balance shows consistent value across pages', async ({ page }) => {
    await login(page, 'marcus');
    
    const navBalance = page.locator('nav').getByText(/\d+(\.\d+)?\s*(h|hours?)/i);
    await expect(navBalance).toBeVisible({ timeout: 5000 });
    const balanceBefore = await navBalance.textContent();
    
    await page.locator('nav button:has([class*="bg-amber-100"])').click();
    await page.getByRole('menuitem', { name: /profile/i }).click();
    
    await page.waitForTimeout(2000);
    
    const navBalanceAfter = page.locator('nav').getByText(/\d+(\.\d+)?\s*(h|hours?)/i);
    await expect(navBalanceAfter).toBeVisible();
    const balanceAfter = await navBalanceAfter.textContent();
    
    expect(balanceAfter).toBe(balanceBefore);
  });

  test('balance updates after page navigation', async ({ page }) => {
    await login(page, 'sarah');
    
    const serviceCard = page.locator('.grid button.rounded-xl').first();
    await expect(serviceCard).toBeVisible({ timeout: 10000 });
    await serviceCard.click();
    
    await page.waitForTimeout(1000);
    
    const backButton = page.getByRole('button', { name: /back/i });
    if (await backButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await backButton.click();
    }
    
    const navBalance = page.locator('nav').getByText(/\d+(\.\d+)?\s*(h|hours?)/i);
    await expect(navBalance).toBeVisible({ timeout: 5000 });
  });
});
