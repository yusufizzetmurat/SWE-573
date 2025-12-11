/**
 * E2E tests for service browsing and creation
 */
import { test, expect } from '@playwright/test'

test.describe('Services', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/')
    await page.click('text=Log In')
    await page.fill('input[name="email"]', 'test@example.com')
    await page.fill('input[name="password"]', 'password123')
    await page.click('button:has-text("Log In")')
    await page.waitForURL(/.*dashboard/)
  })

  test('user can browse services', async ({ page }) => {
    await page.goto('/dashboard')
    
    await expect(page.locator('text=/service/i').first()).toBeVisible()
  })

  test('user can filter services by type', async ({ page }) => {
    await page.goto('/dashboard')
    
    await page.click('button:has-text("Offer")')
    
    await expect(page.locator('[data-testid="service-card"]').first()).toBeVisible()
  })

  test('user can view service details', async ({ page }) => {
    await page.goto('/dashboard')
    
    const firstService = page.locator('[data-testid="service-card"]').first()
    await firstService.click()
    
    await expect(page).toHaveURL(/.*\/services\/.*/)
    await expect(page.locator('h1')).toBeVisible()
  })

  test('user can create a new service', async ({ page }) => {
    await page.goto('/dashboard')
    await page.click('button:has-text("Create Service")')
    
    await page.fill('input[name="title"]', 'New Test Service')
    await page.fill('textarea[name="description"]', 'This is a test service description')
    await page.selectOption('select[name="type"]', 'Offer')
    await page.fill('input[name="duration"]', '2')
    await page.fill('input[name="max_participants"]', '1')
    
    await page.click('button:has-text("Create")')
    
    await expect(page.locator('text=New Test Service')).toBeVisible()
  })

  test('user can search for services', async ({ page }) => {
    await page.goto('/dashboard')
    
    const searchInput = page.locator('input[placeholder*="Search"]')
    await searchInput.fill('cooking')
    await searchInput.press('Enter')
    
    await expect(page.locator('[data-testid="service-card"]').first()).toBeVisible()
  })
})
