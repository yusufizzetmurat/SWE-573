/**
 * E2E tests for authentication flows
 */
import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('user can register a new account', async ({ page }) => {
    await page.click('text=Sign Up')
    
    await page.fill('input[name="email"]', 'newuser@test.com')
    await page.fill('input[name="password"]', 'testpass123')
    await page.fill('input[name="first_name"]', 'New')
    await page.fill('input[name="last_name"]', 'User')
    
    await page.click('button:has-text("Sign Up")')
    
    await expect(page).toHaveURL(/.*dashboard/)
    await expect(page.locator('text=New User')).toBeVisible()
  })

  test('user can login with valid credentials', async ({ page }) => {
    await page.click('text=Log In')
    
    await page.fill('input[name="email"]', 'test@example.com')
    await page.fill('input[name="password"]', 'password123')
    
    await page.click('button:has-text("Log In")')
    
    await expect(page).toHaveURL(/.*dashboard/)
  })

  test('login fails with invalid credentials', async ({ page }) => {
    await page.click('text=Log In')
    
    await page.fill('input[name="email"]', 'test@example.com')
    await page.fill('input[name="password"]', 'wrongpassword')
    
    await page.click('button:has-text("Log In")')
    
    await expect(page.locator('text=/invalid credentials/i')).toBeVisible()
  })

  test('user can logout', async ({ page }) => {
    // Login first
    await page.click('text=Log In')
    await page.fill('input[name="email"]', 'test@example.com')
    await page.fill('input[name="password"]', 'password123')
    await page.click('button:has-text("Log In")')
    
    await page.waitForURL(/.*dashboard/)
    
    // Logout
    await page.click('button:has-text("Logout")')
    
    await expect(page).toHaveURL(/.*\/$/)
  })
})
