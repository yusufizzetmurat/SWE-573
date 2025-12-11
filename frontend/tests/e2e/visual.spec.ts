/**
 * Visual regression tests
 */
import { test, expect } from '@playwright/test'

test.describe('Visual Regression', () => {
  test('homepage matches snapshot', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveScreenshot('homepage.png')
  })

  test('login page matches snapshot', async ({ page }) => {
    await page.goto('/login')
    await expect(page).toHaveScreenshot('login-page.png')
  })

  test('dashboard matches snapshot', async ({ page }) => {
    await page.goto('/')
    await page.click('text=Log In')
    await page.fill('input[name="email"]', 'test@example.com')
    await page.fill('input[name="password"]', 'password123')
    await page.click('button:has-text("Log In")')
    await page.waitForURL(/.*dashboard/)
    
    await expect(page).toHaveScreenshot('dashboard.png')
  })

  test('service detail page matches snapshot', async ({ page }) => {
    await page.goto('/')
    await page.click('text=Log In')
    await page.fill('input[name="email"]', 'test@example.com')
    await page.fill('input[name="password"]', 'password123')
    await page.click('button:has-text("Log In")')
    await page.waitForURL(/.*dashboard/)
    
    const firstService = page.locator('[data-testid="service-card"]').first()
    await firstService.click()
    await page.waitForURL(/.*\/services\/.*/)
    
    await expect(page).toHaveScreenshot('service-detail.png')
  })

  test('profile page matches snapshot', async ({ page }) => {
    await page.goto('/')
    await page.click('text=Log In')
    await page.fill('input[name="email"]', 'test@example.com')
    await page.fill('input[name="password"]', 'password123')
    await page.click('button:has-text("Log In")')
    await page.waitForURL(/.*dashboard/)
    
    await page.click('text=Profile')
    await expect(page).toHaveScreenshot('profile.png')
  })
})
