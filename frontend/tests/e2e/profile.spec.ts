/**
 * E2E tests for user profile management
 */
import { test, expect } from '@playwright/test'

test.describe('User Profile', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.click('text=Log In')
    await page.fill('input[name="email"]', 'test@example.com')
    await page.fill('input[name="password"]', 'password123')
    await page.click('button:has-text("Log In")')
    await page.waitForURL(/.*dashboard/)
  })

  test('user can view their profile', async ({ page }) => {
    await page.click('text=Profile')
    
    await expect(page.locator('text=test@example.com')).toBeVisible()
    await expect(page.locator('text=Test User')).toBeVisible()
  })

  test('user can update profile information', async ({ page }) => {
    await page.click('text=Profile')
    await page.click('button:has-text("Edit")')
    
    await page.fill('textarea[name="bio"]', 'Updated bio text')
    await page.click('button:has-text("Save")')
    
    await expect(page.locator('text=Updated bio text')).toBeVisible()
  })

  test('user can view their achievements', async ({ page }) => {
    await page.click('text=Profile')
    await page.click('text=Achievements')
    
    await expect(page.locator('[data-testid="achievement-card"]').first()).toBeVisible()
  })

  test('user can view their transaction history', async ({ page }) => {
    await page.click('text=Profile')
    await page.click('text=History')
    
    await expect(page.locator('[data-testid="transaction-item"]')).toBeVisible()
  })

  test('user can view public profile of another user', async ({ page }) => {
    await page.goto('/dashboard')
    
    const firstService = page.locator('[data-testid="service-card"]').first()
    await firstService.click()
    
    await page.click('[data-testid="provider-link"]')
    
    await expect(page).toHaveURL(/.*\/users\/.*/)
    await expect(page.locator('h1')).toBeVisible()
  })
})
