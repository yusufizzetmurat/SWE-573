/**
 * Visual regression tests
 */
import { test, expect } from '@playwright/test'

test.describe('Visual Regression', () => {
  // Visual snapshots should be deterministic and not depend on auth state.
  // Projects use storageState by default; override to force a logged-out context.
  test.use({ storageState: { cookies: [], origins: [] } })

  test('homepage matches snapshot', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: /connecting communities/i })).toBeVisible({ timeout: 20000 })
    await expect(page.getByText(/map disabled in e2e/i)).toBeVisible({ timeout: 20000 })

    // Mask hero visuals that can be non-deterministic across engines (image decoding, counters).
    const heroImage = page.getByRole('img', { name: /community sharing/i }).first()
    const heroStats = page.getByText(/hours shared this month/i).first()

    await expect(page).toHaveScreenshot('homepage.png', {
      mask: [heroImage, heroStats],
    })
  })

  test('login page matches snapshot', async ({ page }) => {
    await page.goto('/login')
    await expect(page).toHaveScreenshot('login-page.png')
  })
})
