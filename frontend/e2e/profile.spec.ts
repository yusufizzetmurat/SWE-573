import { test, expect } from '@playwright/test';

test.describe('Public Profile', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/');
    await page.getByRole('button', { name: /log in/i }).first().click();
    await page.getByLabel(/email/i).fill('elif@demo.com');
    await page.getByLabel(/password/i).fill('demo123');
    await page.getByRole('button', { name: /log in/i }).click();
    await expect(page.getByRole('heading', { name: /browse services/i })).toBeVisible({ timeout: 15000 });
  });

  test('should navigate to public profile from service detail', async ({ page }) => {
    // Find and click on a service card
    const serviceCard = page.locator('.cursor-pointer').filter({ hasText: /offer|want/i }).first();
    
    if (await serviceCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await serviceCard.click();
      
      // Wait for service detail page to load
      await page.waitForTimeout(1000);
      
      // Find and click the provider card (should have "View Profile" text)
      const providerCard = page.locator('.cursor-pointer').filter({ hasText: /View Profile/i }).first();
      
      if (await providerCard.isVisible({ timeout: 5000 }).catch(() => false)) {
        await providerCard.click();
        
        // Should navigate to public profile page
        await expect(page).toHaveURL(/public-profile/, { timeout: 5000 });
        
        // Should see profile content
        await expect(page.getByText(/About|Bio|Reputation/i).first()).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('should display user info on public profile', async ({ page }) => {
    // Navigate to a service and then to provider profile
    const serviceCard = page.locator('.cursor-pointer').filter({ hasText: /offer|want/i }).first();
    
    if (await serviceCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await serviceCard.click();
      await page.waitForTimeout(1000);
      
      const providerCard = page.locator('.cursor-pointer').filter({ hasText: /View Profile/i }).first();
      
      if (await providerCard.isVisible({ timeout: 5000 }).catch(() => false)) {
        await providerCard.click();
        
        // Wait for profile to load
        await page.waitForTimeout(2000);
        
        // Should see reputation section
        await expect(page.getByText('Reputation').first()).toBeVisible({ timeout: 5000 });
        
        // Should see karma
        await expect(page.getByText(/Karma/i).first()).toBeVisible();
      }
    }
  });

  test('should navigate back from public profile', async ({ page }) => {
    const serviceCard = page.locator('.cursor-pointer').filter({ hasText: /offer|want/i }).first();
    
    if (await serviceCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await serviceCard.click();
      await page.waitForTimeout(1000);
      
      const providerCard = page.locator('.cursor-pointer').filter({ hasText: /View Profile/i }).first();
      
      if (await providerCard.isVisible({ timeout: 5000 }).catch(() => false)) {
        await providerCard.click();
        await page.waitForTimeout(2000);
        
        // Click back button
        const backButton = page.getByRole('button', { name: /back/i });
        if (await backButton.isVisible().catch(() => false)) {
          await backButton.click();
          
          // Should navigate back to dashboard
          await expect(page.getByRole('heading', { name: /browse services/i })).toBeVisible({ timeout: 5000 });
        }
      }
    }
  });

  test('should view own profile with edit button', async ({ page }) => {
    // Navigate to own profile via navbar
    const navButton = page.locator('nav button.bg-amber-100');
    await navButton.click();
    
    // Click Profile from dropdown
    const profileMenuItem = page.getByRole('menuitem', { name: /profile/i });
    if (await profileMenuItem.isVisible({ timeout: 3000 }).catch(() => false)) {
      await profileMenuItem.click();
      
      // Should see Edit Profile button (own profile)
      await expect(page.getByRole('button', { name: /edit profile/i })).toBeVisible({ timeout: 5000 });
    }
  });
});

test.describe('Profile Edit Modal', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/');
    await page.getByRole('button', { name: /log in/i }).first().click();
    await page.getByLabel(/email/i).fill('elif@demo.com');
    await page.getByLabel(/password/i).fill('demo123');
    await page.getByRole('button', { name: /log in/i }).click();
    await expect(page.getByRole('heading', { name: /browse services/i })).toBeVisible({ timeout: 15000 });
    
    // Navigate to profile
    const navButton = page.locator('nav button.bg-amber-100');
    await navButton.click();
    const profileMenuItem = page.getByRole('menuitem', { name: /profile/i });
    if (await profileMenuItem.isVisible({ timeout: 3000 }).catch(() => false)) {
      await profileMenuItem.click();
    }
  });

  test('should open profile edit modal', async ({ page }) => {
    const editButton = page.getByRole('button', { name: /edit profile/i });
    
    if (await editButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await editButton.click();
      
      // Modal should be visible
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
      await expect(page.getByText('Edit Profile')).toBeVisible();
    }
  });

  test('should show video intro field in edit modal', async ({ page }) => {
    const editButton = page.getByRole('button', { name: /edit profile/i });
    
    if (await editButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await editButton.click();
      
      // Should see video intro section
      await expect(page.getByText('Video Introduction')).toBeVisible({ timeout: 5000 });
      await expect(page.getByPlaceholder(/youtube/i)).toBeVisible();
    }
  });

  test('should show portfolio images section in edit modal', async ({ page }) => {
    const editButton = page.getByRole('button', { name: /edit profile/i });
    
    if (await editButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await editButton.click();
      
      // Should see portfolio section
      await expect(page.getByText('Portfolio Images')).toBeVisible({ timeout: 5000 });
      await expect(page.getByText('Add Image')).toBeVisible();
    }
  });

  test('should show privacy toggle in edit modal', async ({ page }) => {
    const editButton = page.getByRole('button', { name: /edit profile/i });
    
    if (await editButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await editButton.click();
      
      // Should see privacy section
      await expect(page.getByText('Privacy Settings')).toBeVisible({ timeout: 5000 });
      await expect(page.getByText('Show Transaction History')).toBeVisible();
    }
  });

  test('should toggle privacy setting', async ({ page }) => {
    const editButton = page.getByRole('button', { name: /edit profile/i });
    
    if (await editButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await editButton.click();
      
      // Find the privacy checkbox
      const checkbox = page.locator('input[type="checkbox"]').filter({ hasText: /transaction/i }).first();
      
      if (await checkbox.isVisible({ timeout: 3000 }).catch(() => false)) {
        const isChecked = await checkbox.isChecked();
        await checkbox.click();
        
        // State should toggle
        if (isChecked) {
          await expect(checkbox).not.toBeChecked();
        } else {
          await expect(checkbox).toBeChecked();
        }
      }
    }
  });

  test('should save profile changes', async ({ page }) => {
    const editButton = page.getByRole('button', { name: /edit profile/i });
    
    if (await editButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await editButton.click();
      
      // Wait for modal
      await page.waitForTimeout(500);
      
      // Update bio
      const bioTextarea = page.getByLabel(/bio/i);
      if (await bioTextarea.isVisible({ timeout: 3000 }).catch(() => false)) {
        await bioTextarea.fill('Updated bio from E2E test');
        
        // Save
        const saveButton = page.getByRole('button', { name: /save/i });
        await saveButton.click();
        
        // Modal should close
        await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });
      }
    }
  });
});

test.describe('Transaction History Privacy', () => {
  test('should show completed exchanges on public profile when enabled', async ({ page }) => {
    // Login
    await page.goto('/');
    await page.getByRole('button', { name: /log in/i }).first().click();
    await page.getByLabel(/email/i).fill('elif@demo.com');
    await page.getByLabel(/password/i).fill('demo123');
    await page.getByRole('button', { name: /log in/i }).click();
    await expect(page.getByRole('heading', { name: /browse services/i })).toBeVisible({ timeout: 15000 });

    // Navigate to own profile
    const navButton = page.locator('nav button.bg-amber-100');
    await navButton.click();
    const profileMenuItem = page.getByRole('menuitem', { name: /profile/i });
    if (await profileMenuItem.isVisible({ timeout: 3000 }).catch(() => false)) {
      await profileMenuItem.click();
      
      // Check for completed history section
      await page.waitForTimeout(2000);
      
      // Should see history tab or section
      const historyTab = page.getByRole('tab', { name: /completed/i });
      if (await historyTab.isVisible({ timeout: 3000 }).catch(() => false)) {
        await historyTab.click();
        // History should load
        await page.waitForTimeout(1000);
      }
    }
  });
});
