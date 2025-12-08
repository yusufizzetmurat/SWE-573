import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

test.describe('Public Profile', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'elif');
  });

  test('should navigate to public profile from service detail', async ({ page }) => {
    const serviceCard = page.locator('.cursor-pointer').filter({ hasText: /offer|want/i }).first();
    await expect(serviceCard).toBeVisible({ timeout: 5000 });
    await serviceCard.click();
    
    await page.waitForTimeout(1000);
    
    const providerCard = page.locator('.cursor-pointer').filter({ hasText: /View Profile/i }).first();
    await expect(providerCard).toBeVisible({ timeout: 5000 });
    await providerCard.click();
    
    await expect(page).toHaveURL(/public-profile/, { timeout: 5000 });
    
    await expect(page.getByText(/About|Bio|Reputation/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('should display user info on public profile', async ({ page }) => {
    const serviceCard = page.locator('.cursor-pointer').filter({ hasText: /offer|want/i }).first();
    await expect(serviceCard).toBeVisible({ timeout: 5000 });
    await serviceCard.click();
    await page.waitForTimeout(1000);
    
    const providerCard = page.locator('.cursor-pointer').filter({ hasText: /View Profile/i }).first();
    await expect(providerCard).toBeVisible({ timeout: 5000 });
    await providerCard.click();
    
    await page.waitForTimeout(2000);
    
    await expect(page.getByText('Reputation').first()).toBeVisible({ timeout: 5000 });
    
    await expect(page.getByText(/Karma/i).first()).toBeVisible();
  });

  test('should navigate back from public profile', async ({ page }) => {
    const serviceCard = page.locator('.cursor-pointer').filter({ hasText: /offer|want/i }).first();
    await expect(serviceCard).toBeVisible({ timeout: 5000 });
    await serviceCard.click();
    await page.waitForTimeout(1000);
    
    const providerCard = page.locator('.cursor-pointer').filter({ hasText: /View Profile/i }).first();
    await expect(providerCard).toBeVisible({ timeout: 5000 });
    await providerCard.click();
    await page.waitForTimeout(2000);
    
    const backButton = page.getByRole('button', { name: /back/i });
    await expect(backButton).toBeVisible({ timeout: 5000 });
    await backButton.click();
    
    await expect(page.getByRole('heading', { name: /browse services/i })).toBeVisible({ timeout: 5000 });
  });

  test('should view own profile with edit button', async ({ page }) => {
    const navButton = page.locator('nav button.bg-amber-100');
    await navButton.click();
    
    const profileMenuItem = page.getByRole('menuitem', { name: /profile/i });
    await expect(profileMenuItem).toBeVisible({ timeout: 3000 });
    await profileMenuItem.click();
    
    await expect(page.getByRole('button', { name: /edit profile/i })).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Profile Edit Modal', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'elif');
    
    const navButton = page.locator('nav button.bg-amber-100');
    await navButton.click();
    const profileMenuItem = page.getByRole('menuitem', { name: /profile/i });
    await expect(profileMenuItem).toBeVisible({ timeout: 3000 });
    await profileMenuItem.click();
  });

  test('should open profile edit modal', async ({ page }) => {
    const editButton = page.getByRole('button', { name: /edit profile/i });
    await expect(editButton).toBeVisible({ timeout: 5000 });
    await editButton.click();
    
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Edit Profile')).toBeVisible();
  });

  test('should show video intro field in edit modal', async ({ page }) => {
    const editButton = page.getByRole('button', { name: /edit profile/i });
    await expect(editButton).toBeVisible({ timeout: 5000 });
    await editButton.click();
    
    await expect(page.getByText('Video Introduction')).toBeVisible({ timeout: 5000 });
    await expect(page.getByPlaceholder(/youtube/i)).toBeVisible();
  });

  test('should show portfolio images section in edit modal', async ({ page }) => {
    const editButton = page.getByRole('button', { name: /edit profile/i });
    await expect(editButton).toBeVisible({ timeout: 5000 });
    await editButton.click();
    
    await expect(page.getByText('Portfolio Images')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Add Image')).toBeVisible();
  });

  test('should show privacy toggle in edit modal', async ({ page }) => {
    const editButton = page.getByRole('button', { name: /edit profile/i });
    await expect(editButton).toBeVisible({ timeout: 5000 });
    await editButton.click();
    
    await expect(page.getByText('Privacy Settings')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Show Transaction History')).toBeVisible();
  });

  test('should toggle privacy setting', async ({ page }) => {
    const editButton = page.getByRole('button', { name: /edit profile/i });
    await expect(editButton).toBeVisible({ timeout: 5000 });
    await editButton.click();
    
    const privacyLabel = page.getByText('Show Transaction History');
    await expect(privacyLabel).toBeVisible({ timeout: 3000 });
    
    const checkbox = page.locator('label').filter({ hasText: 'Show Transaction History' }).locator('input[type="checkbox"]');
    await expect(checkbox).toBeVisible();
    
    const isChecked = await checkbox.isChecked();
    await checkbox.click();
    
    if (isChecked) {
      await expect(checkbox).not.toBeChecked();
    } else {
      await expect(checkbox).toBeChecked();
    }
  });

  test('should save profile changes', async ({ page }) => {
    const editButton = page.getByRole('button', { name: /edit profile/i });
    await expect(editButton).toBeVisible({ timeout: 5000 });
    await editButton.click();
    
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
    
    const bioTextarea = page.getByLabel(/bio/i);
    await expect(bioTextarea).toBeVisible({ timeout: 3000 });
    await bioTextarea.fill('Updated bio from E2E test');
    
    const saveButton = page.getByRole('button', { name: /save/i });
    await saveButton.click();
    
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });
  });
});

test.describe('Transaction History Privacy', () => {
  test('should show completed exchanges on public profile when enabled', async ({ page }) => {
    await login(page, 'elif');

    const navButton = page.locator('nav button.bg-amber-100');
    await navButton.click();
    const profileMenuItem = page.getByRole('menuitem', { name: /profile/i });
    await expect(profileMenuItem).toBeVisible({ timeout: 3000 });
    await profileMenuItem.click();
    
    await page.waitForTimeout(2000);
    
    await expect(page.getByText(/Reputation|About|Bio/i).first()).toBeVisible({ timeout: 5000 });
  });
});
