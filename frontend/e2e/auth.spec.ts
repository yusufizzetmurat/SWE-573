import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should display login page', async ({ page }) => {
    await page.goto('/');
    
    // Navigate to login (use first() since there are 2 Log In buttons - header and hero)
    await page.getByRole('button', { name: /log in/i }).first().click();
    
    // Verify login form elements
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /log in/i })).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /log in/i }).first().click();
    
    // Fill invalid credentials
    await page.getByLabel(/email/i).fill('invalid@test.com');
    await page.getByLabel(/password/i).fill('wrongpassword');
    await page.getByRole('button', { name: /log in/i }).click();
    
    // Wait for error message (red error box) - use first() since there may be multiple elements
    await expect(page.locator('.bg-red-50').first()).toBeVisible({ timeout: 10000 });
  });

  test('should login with valid demo credentials', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /log in/i }).first().click();
    
    // Fill demo credentials
    await page.getByLabel(/email/i).fill('elif@demo.com');
    await page.getByLabel(/password/i).fill('demo123');
    await page.getByRole('button', { name: /log in/i }).click();
    
    // Wait for redirect to dashboard (look for Browse Services heading)
    await expect(page.getByRole('heading', { name: /browse services/i })).toBeVisible({ timeout: 15000 });
  });

  test('should display registration page', async ({ page }) => {
    await page.goto('/');
    
    // Navigate to registration (use first() for header button)
    await page.getByRole('button', { name: /sign up/i }).first().click();
    
    // Verify registration form elements using labels
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/^password$/i)).toBeVisible();
    await expect(page.getByLabel(/first name/i)).toBeVisible();
    await expect(page.getByLabel(/last name/i)).toBeVisible();
  });

  test('should logout successfully', async ({ page }) => {
    // First login
    await page.goto('/');
    await page.getByRole('button', { name: /log in/i }).first().click();
    await page.getByLabel(/email/i).fill('elif@demo.com');
    await page.getByLabel(/password/i).fill('demo123');
    await page.getByRole('button', { name: /log in/i }).click();
    
    // Wait for dashboard
    await expect(page.getByRole('heading', { name: /browse services/i })).toBeVisible({ timeout: 15000 });
    
    // Find and click user menu (the amber avatar button in navbar)
    await page.locator('nav button.bg-amber-100').click();
    
    // Click logout from dropdown
    await page.getByRole('menuitem', { name: /log out/i }).click();
    
    // Verify logged out - should see login button again (use first() since homepage has 2)
    await expect(page.getByRole('button', { name: /log in/i }).first()).toBeVisible({ timeout: 10000 });
  });
});
