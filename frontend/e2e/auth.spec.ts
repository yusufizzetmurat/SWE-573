import { test, expect } from '@playwright/test';
import { login, logout, generateTestEmail, DEMO_USERS } from './helpers/auth';

test.describe('Authentication', () => {
  test('should display login page', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /log in/i }).first().click();
    
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /log in/i })).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /log in/i }).first().click();
    
    await page.getByLabel(/email/i).fill('invalid@test.com');
    await page.getByLabel(/password/i).fill('wrongpassword');
    await page.getByRole('button', { name: /log in/i }).click();
    
    await expect(page.locator('.bg-red-50').first()).toBeVisible({ timeout: 10000 });
  });

  test('should login with valid demo credentials', async ({ page }) => {
    await login(page, 'elif');
    await expect(page.getByRole('heading', { name: /browse services/i })).toBeVisible();
  });

  test('should display registration page', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /sign up/i }).first().click();
    
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/^password$/i)).toBeVisible();
    await expect(page.getByLabel(/first name/i)).toBeVisible();
    await expect(page.getByLabel(/last name/i)).toBeVisible();
  });

  test.skip('should complete full registration flow', async ({ page }) => {
    const testEmail = generateTestEmail();
    
    await page.goto('/');
    await page.getByRole('button', { name: /sign up/i }).first().click();
    
    await page.getByLabel(/email/i).fill(testEmail);
    await page.getByLabel(/^password$/i).fill('TestPass123!');
    await page.getByLabel(/first name/i).fill('Test');
    await page.getByLabel(/last name/i).fill('User');
    
    await page.getByRole('button', { name: /sign up|register|create/i }).click();
    
    await page.waitForTimeout(3000);
    
    const isLoggedIn = await page.locator('nav button.bg-amber-100').isVisible({ timeout: 15000 }).catch(() => false);
    const isDashboard = await page.getByRole('heading', { name: /browse services/i }).isVisible({ timeout: 5000 }).catch(() => false);
    
    expect(isLoggedIn || isDashboard).toBeTruthy();
  });

  test('should logout successfully', async ({ page }) => {
    await login(page, 'elif');
    await logout(page);
    await expect(page.getByRole('button', { name: /log in/i }).first()).toBeVisible();
  });

  test('should persist session after page refresh', async ({ page }) => {
    await login(page, 'cem');
    
    await page.reload();
    
    await expect(page.getByRole('heading', { name: /browse services/i })).toBeVisible({ timeout: 15000 });
    await expect(page.locator('nav button.bg-amber-100')).toBeVisible();
  });
});
