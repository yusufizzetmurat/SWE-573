/**
 * E2E tests for handshake flows
 */
import { test, expect } from '@playwright/test'

test.describe('Handshakes', () => {
  test.beforeEach(async ({ page }) => {
    // Login as requester
    await page.goto('/')
    await page.click('text=Log In')
    await page.fill('input[name="email"]', 'requester@test.com')
    await page.fill('input[name="password"]', 'password123')
    await page.click('button:has-text("Log In")')
    await page.waitForURL(/.*dashboard/)
  })

  test('user can express interest in a service', async ({ page }) => {
    await page.goto('/dashboard')
    
    const firstService = page.locator('[data-testid="service-card"]').first()
    await firstService.click()
    
    await page.click('button:has-text("Express Interest")')
    
    await expect(page.locator('text=/interest expressed/i')).toBeVisible()
  })

  test('user can view their handshakes', async ({ page }) => {
    await page.goto('/dashboard')
    await page.click('text=Handshakes')
    
    await expect(page.locator('text=/handshake/i')).toBeVisible()
  })

  test('provider can initiate handshake', async ({ page, context }) => {
    // First, express interest as requester
    await page.goto('/dashboard')
    const firstService = page.locator('[data-testid="service-card"]').first()
    await firstService.click()
    await page.click('button:has-text("Express Interest")')
    
    // Switch to provider account
    await page.click('button:has-text("Logout")')
    await page.click('text=Log In')
    await page.fill('input[name="email"]', 'provider@test.com')
    await page.fill('input[name="password"]', 'password123')
    await page.click('button:has-text("Log In")')
    
    await page.goto('/dashboard')
    await page.click('text=Handshakes')
    
    await page.click('button:has-text("Initiate")')
    
    await expect(page.locator('text=/initiated/i')).toBeVisible()
  })

  test('user can confirm handshake completion', async ({ page }) => {
    await page.goto('/dashboard')
    await page.click('text=Handshakes')
    
    const completedHandshake = page.locator('[data-testid="handshake-card"]').filter({
      hasText: 'accepted'
    }).first()
    
    await completedHandshake.click()
    await page.click('button:has-text("Confirm Completion")')
    
    await expect(page.locator('text=/completed/i')).toBeVisible()
  })
})
