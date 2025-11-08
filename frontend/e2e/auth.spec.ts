import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should display login page', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Log In');
    await expect(page).toHaveURL(/.*login/);
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
  });

  test('should show validation errors for empty form', async ({ page }) => {
    await page.goto('/login');
    await page.click('button:has-text("Log In")');
    await expect(page.getByText(/email is required/i)).toBeVisible();
  });

  test('should navigate to registration', async ({ page }) => {
    await page.goto('/login');
    await page.click('text=Sign Up');
    await expect(page).toHaveURL(/.*register/);
  });
});

