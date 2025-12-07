import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should display login page', async ({ page }) => {
    await page.goto('/');
    
    // Navigate to login
    await page.click('text=Log in');
    
    // Verify login form elements
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /log in|sign in/i })).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Log in');
    
    // Fill invalid credentials
    await page.fill('input[type="email"]', 'invalid@test.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    // Wait for error message
    await expect(page.locator('text=/invalid|error|incorrect/i')).toBeVisible({ timeout: 10000 });
  });

  test('should login with valid demo credentials', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Log in');
    
    // Fill demo credentials
    await page.fill('input[type="email"]', 'elif@demo.com');
    await page.fill('input[type="password"]', 'demo123');
    await page.click('button[type="submit"]');
    
    // Wait for redirect to dashboard
    await expect(page).toHaveURL(/dashboard|home/i, { timeout: 15000 });
  });

  test('should display registration page', async ({ page }) => {
    await page.goto('/');
    
    // Navigate to registration
    await page.click('text=Sign up');
    
    // Verify registration form elements
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('input[name="first_name"], input[placeholder*="First"]')).toBeVisible();
    await expect(page.locator('input[name="last_name"], input[placeholder*="Last"]')).toBeVisible();
  });

  test('should logout successfully', async ({ page }) => {
    // First login
    await page.goto('/');
    await page.click('text=Log in');
    await page.fill('input[type="email"]', 'elif@demo.com');
    await page.fill('input[type="password"]', 'demo123');
    await page.click('button[type="submit"]');
    
    // Wait for dashboard
    await expect(page).toHaveURL(/dashboard|home/i, { timeout: 15000 });
    
    // Find and click logout
    await page.click('[data-testid="user-menu"], button:has-text("Profile"), .avatar, img[alt*="avatar"]');
    await page.click('text=/log out|sign out/i');
    
    // Verify logged out - should see login button again
    await expect(page.locator('text=Log in')).toBeVisible({ timeout: 10000 });
  });
});
