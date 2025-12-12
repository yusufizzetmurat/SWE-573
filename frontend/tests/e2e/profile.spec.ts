/**
 * E2E tests for user profile management
 */
import { test, expect, type Locator, type TestInfo } from '@playwright/test'

const isMobileProject = (testInfo: TestInfo) => testInfo.project.name.startsWith('mobile-')

async function safeClick(locator: Locator, options?: { timeout?: number }) {
  const timeout = options?.timeout ?? 15000
  await locator.scrollIntoViewIfNeeded().catch(() => {})
  await locator.click({ timeout }).catch(async () => {
    await locator.click({ timeout, force: true })
  })
}

test.describe('User Profile', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard')
  })

  test('user can view their profile', async ({ page }) => {
    await page.goto('/profile')
    const heading = page.locator('h1')
    await expect(heading).toBeVisible({ timeout: 15000 })
    await expect(heading).not.toContainText(/guest/i)
  })

  test('user can update profile information', async ({ page }) => {
    const newBio = `E2E bio update ${Date.now()}`

    await page.goto('/profile')
    await expect(page.getByTestId('profile-edit-open')).toBeVisible({ timeout: 15000 })
    await safeClick(page.getByTestId('profile-edit-open'))

    await expect(page.getByTestId('profile-edit-bio')).toBeVisible({ timeout: 15000 })
    await page.getByTestId('profile-edit-bio').fill(newBio)
    await safeClick(page.getByTestId('profile-edit-submit'))

    await expect(page.getByText(newBio).first()).toBeVisible({ timeout: 20000 })
  })

  test('user can view their achievements', async ({ page }) => {
    await page.goto('/profile')
    await safeClick(page.getByRole('button', { name: /view achievements/i }))
    await expect(page).toHaveURL(/.*\/achievements/)
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 15000 })
  })

  test('user can view their transaction history', async ({ page }) => {
    await page.goto('/transaction-history')
    await expect(page.getByRole('heading', { name: /transaction history/i })).toBeVisible({ timeout: 20000 })
  })

  test('user can view public profile of another user', async ({ page }, testInfo) => {
    await page.goto('/dashboard')
    await expect(page.getByRole('heading', { name: /browse services/i })).toBeVisible({ timeout: 20000 })
    await page.locator('text=Loading services...').waitFor({ state: 'hidden', timeout: 20000 }).catch(() => {})

    const firstService = page.getByTestId('service-card').first()
    await expect(firstService).toBeAttached({ timeout: 20000 })
    await firstService.scrollIntoViewIfNeeded().catch(() => {})

    const serviceId = await firstService.getAttribute('data-service-id')
    if (serviceId) {
      await page.goto(`/service-detail/${serviceId}`)
    } else {
      await safeClick(firstService)
    }

    await expect(page).toHaveURL(/.*\/service-detail\/.*/, { timeout: 15000 })

    const oops = page.getByRole('heading', { name: /oops!\s+something went wrong/i })
    const providerCard = page.getByTestId('provider-card')

    const outcome = await Promise.race([
      providerCard
        .waitFor({ state: 'visible', timeout: 15000 })
        .then(() => 'provider' as const)
        .catch(() => 'timeout' as const),
      oops
        .waitFor({ state: 'visible', timeout: 15000 })
        .then(() => 'oops' as const)
        .catch(() => 'timeout' as const),
    ])

    if (outcome === 'oops') {
      const summary = page.locator('details summary').first()
      await summary.click().catch(() => {})
      const errorText = await page.locator('details p').first().innerText().catch(() => 'Unknown error')
      throw new Error(`Service detail crashed: ${errorText}`)
    }

    if (isMobileProject(testInfo)) {
      await safeClick(providerCard)
    } else {
      await providerCard.click()
    }
    await expect(page).toHaveURL(/.*\/public-profile\/.+/, { timeout: 20000 })
    await expect(page.getByTestId('public-profile-page')).toBeVisible({ timeout: 20000 })
    await expect(page.getByTestId('public-profile-name')).toBeVisible({ timeout: 20000 })
  })
})
