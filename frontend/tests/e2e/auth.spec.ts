/**
 * E2E tests for authentication flows
 */
import { test, expect } from '@playwright/test'
import { logout } from './helpers/auth'

const loggedOutState = { cookies: [], origins: [] } as const

test.describe('Authentication (Logged Out)', () => {
  // Projects use storageState by default; override to make auth UI tests deterministic.
  test.use({ storageState: loggedOutState })

  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('login page is reachable from home', async ({ page }) => {
    await page.getByRole('button', { name: /log in/i }).first().click()
    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.getByLabel(/password/i)).toBeVisible()
  })

  test('login fails with invalid credentials', async ({ page }) => {
    await page.getByRole('button', { name: /log in/i }).first().click()
    await page.getByLabel(/email/i).fill('invalid@test.com')
    await page.getByLabel(/password/i).fill('wrongpassword')
    await page.getByRole('button', { name: /^log in$/i }).click()
    await expect(page.locator('.bg-red-50').first()).toBeVisible({ timeout: 10000 })
  })

  test('registration page is reachable from home', async ({ page }) => {
    await page.getByRole('button', { name: /sign up/i }).first().click()
    await expect(page.getByLabel(/first name/i)).toBeVisible()
    await expect(page.getByLabel(/last name/i)).toBeVisible()
    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.getByLabel(/^password$/i)).toBeVisible()
  })

  test('user can login with valid credentials', async ({ page }) => {
    await page.getByRole('button', { name: /log in/i }).first().click()
    await page.getByLabel(/email/i).fill('elif@demo.com')
    await page.getByLabel(/password/i).fill('demo123')
    await page.getByRole('button', { name: /^log in$/i }).click()

    await expect(page.getByRole('heading', { name: /browse services/i })).toBeVisible({ timeout: 20000 })
  })
})

test.describe('Authentication (Authenticated Session)', () => {
  test('authenticated user can open dashboard', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.getByRole('heading', { name: /browse services/i })).toBeVisible({ timeout: 20000 })
  })

  test('user can logout', async ({ page }) => {
    await page.goto('/dashboard')
    await logout(page)
    await expect(page.getByRole('button', { name: /log in/i }).first()).toBeVisible()
  })
})
