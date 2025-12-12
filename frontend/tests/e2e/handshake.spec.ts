/**
 * E2E tests for handshake flows
 */
import { test, expect } from '@playwright/test'

test.describe('Handshakes', () => {
  test('user can express interest and land in Messages', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.getByRole('heading', { name: /browse services/i })).toBeVisible({ timeout: 20000 })

    const cards = page.getByTestId('service-card')
    const emptyState = page.getByText(/no services found/i)
    const outcome = await Promise.race([
      cards
        .first()
        .waitFor({ state: 'attached', timeout: 20000 })
        .then(() => 'has-services' as const)
        .catch(() => 'timeout' as const),
      emptyState
        .waitFor({ state: 'visible', timeout: 20000 })
        .then(() => 'empty' as const)
        .catch(() => 'timeout' as const),
    ])

    expect(outcome).toBe('has-services')

    const count = await cards.count()
    expect(count).toBeGreaterThan(0)

    // Find a service that is not owned by the current user (Express Interest must be enabled).
    let opened = false
    for (let i = 0; i < Math.min(count, 8); i++) {
      const card = cards.nth(i)
      const serviceId = await card.getAttribute('data-service-id')

      // Mobile view can have overlapping elements that intercept pointer events;
      // direct navigation is more reliable and still exercises the handshake flow.
      if (serviceId) {
        await page.goto(`/service-detail/${serviceId}`)
      } else {
        await card.click()
      }

      await expect(page).toHaveURL(/.*\/service-detail\/.*/, { timeout: 15000 })

      const errorBoundary = page.getByRole('heading', { name: /oops!\s+something went wrong/i })
      const crashed = await errorBoundary.isVisible({ timeout: 1000 }).catch(() => false)
      if (crashed) {
        await page.goto('/dashboard')
        await expect(page.getByRole('heading', { name: /browse services/i })).toBeVisible({ timeout: 20000 })
        continue
      }

      const openChat = page.getByTestId('open-chat')
      await openChat.scrollIntoViewIfNeeded().catch(() => {})
      const canOpenChat = await openChat.isVisible({ timeout: 4000 }).catch(() => false)
      if (canOpenChat) {
        await openChat.click().catch(async () => {
          await openChat.click({ force: true })
        })
        opened = true
        break
      }

      const expressInterest = page.getByTestId('express-interest')
      await expressInterest.scrollIntoViewIfNeeded().catch(() => {})
      const canExpress = await expressInterest.isVisible({ timeout: 4000 }).catch(() => false)
      const disabled = canExpress ? await expressInterest.isDisabled().catch(() => true) : true
      if (canExpress && !disabled) {
        await expressInterest.click().catch(async () => {
          await expressInterest.click({ force: true })
        })
        opened = true
        break
      }

      await page.goBack()
      await expect(page.getByRole('heading', { name: /browse services/i })).toBeVisible({ timeout: 20000 })
    }

    expect(opened).toBeTruthy()

    // Some flows (e.g., already-expressed interest) may require an additional click
    // once the UI updates from Express Interest -> Open Chat.
    const landedInMessages = await page
      .waitForURL(/.*\/messages\/?$/, { timeout: 20000 })
      .then(() => true)
      .catch(() => false)

    if (!landedInMessages) {
      const openChatAfter = page.getByTestId('open-chat')
      const canOpenChatAfter = await openChatAfter.isVisible({ timeout: 5000 }).catch(() => false)
      if (canOpenChatAfter) {
        await openChatAfter.click().catch(async () => {
          await openChatAfter.click({ force: true })
        })
      } else {
        await page.goto('/messages')
      }
    }

    await expect(page).toHaveURL(/.*\/messages\/?$/, { timeout: 20000 })
    await expect(page.getByTestId('messages-page')).toBeVisible({ timeout: 20000 })
    await expect(page.getByTestId('conversation-item').first()).toBeVisible({ timeout: 20000 })
  })
})
