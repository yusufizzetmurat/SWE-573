/**
 * E2E tests for service browsing and creation
 */
import { test, expect, type Locator } from '@playwright/test'

async function safeClick(locator: Locator, options?: { timeout?: number }) {
  const timeout = options?.timeout ?? 15000
  const fastTimeout = Math.min(3000, timeout)
  await locator.scrollIntoViewIfNeeded().catch(() => {})
  await locator.click({ timeout: fastTimeout }).catch(async () => {
    await locator.click({ timeout, force: true })
  })
}

async function selectRadixOptionByName(args: {
  page: any
  trigger: Locator
  optionName: RegExp
  timeout?: number
}) {
  const timeout = args.timeout ?? 15000

  await safeClick(args.trigger, { timeout })
  await expect(args.trigger).toHaveAttribute('aria-expanded', 'true', { timeout }).catch(() => {})
  const controlsId = await args.trigger.getAttribute('aria-controls')
  const listbox = controlsId
    ? args.page.locator(`[id="${controlsId}"]`)
    : args.page.getByRole('listbox').first()
  await expect(listbox).toBeVisible({ timeout })

  const option = listbox.getByRole('option', { name: args.optionName })
  await option.waitFor({ state: 'visible', timeout })

  // Mobile projects can be sensitive to click vs touch; try tap first.
  await option.tap({ timeout }).catch(async () => {
    await option.click({ timeout, force: true })
  })

  // If selection didn't take (observed on mobile), try Radix typeahead.
  const optionLabel = args.optionName.source.replace(/\^|\$|\\/g, '')
  await safeClick(args.trigger, { timeout }).catch(() => {})
  await expect(args.trigger).toHaveAttribute('aria-expanded', 'true', { timeout }).catch(() => {})
  await expect(listbox).toBeVisible({ timeout }).catch(() => {})
  await args.page.keyboard.type(optionLabel, { delay: 10 }).catch(() => {})
  await args.page.keyboard.press('Enter').catch(() => {})
}

test.describe('Services', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.getByRole('heading', { name: /browse services/i })).toBeVisible()
    await page.locator('text=Loading services...').waitFor({ state: 'hidden', timeout: 20000 }).catch(() => {})

    const e2eBackendEnabled = ['1', 'true', 'yes', 'y', 'on'].includes(
      String(process.env.DJANGO_E2E ?? process.env.E2E ?? '').trim().toLowerCase()
    )
    if (!e2eBackendEnabled) {
      const isThrottled = await page.getByText(/request was throttled/i).isVisible().catch(() => false)
      expect(isThrottled).toBeFalsy()
    }
  })

  test('user can browse services', async ({ page }) => {
    const hasService = await page.getByTestId('service-card').first().isVisible({ timeout: 15000 }).catch(() => false)
    const hasEmpty = await page.getByText(/no services found/i).isVisible({ timeout: 15000 }).catch(() => false)
    expect(hasService || hasEmpty).toBeTruthy()
  })

  test('user can use dashboard filters', async ({ page }) => {
    const onlineOnly = page.getByRole('button', { name: /online only/i })
    await safeClick(onlineOnly)
    await expect(page.locator('text=Loading services...')).toBeHidden({ timeout: 20000 }).catch(() => {})
    // Either services remain (attached in DOM) or a "No services" empty state appears.
    const firstCard = page.getByTestId('service-card').first()
    const emptyState = page.getByText(/no services found/i)

    const outcome = await Promise.race([
      firstCard
        .waitFor({ state: 'attached', timeout: 15000 })
        .then(() => 'service' as const)
        .catch(() => 'timeout' as const),
      emptyState
        .waitFor({ state: 'visible', timeout: 15000 })
        .then(() => 'empty' as const)
        .catch(() => 'timeout' as const),
    ])

    expect(outcome === 'service' || outcome === 'empty').toBeTruthy()
  })

  test('user can view service details', async ({ page }) => {
    const firstService = page.getByTestId('service-card').first()
    await expect(firstService).toBeAttached({ timeout: 20000 })
    await firstService.scrollIntoViewIfNeeded().catch(() => {})

    const serviceId = await firstService.getAttribute('data-service-id')
    if (serviceId) {
      await page.goto(`/service-detail/${serviceId}`)
    } else {
      await safeClick(firstService)
    }

    await expect(page).toHaveURL(/.*\/service-detail\/.*/)
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 15000 })
  })

  test('user can create a new service (online offer)', async ({ page }) => {
    test.setTimeout(120000)
    const title = `E2E Offer ${Date.now()}`

    await safeClick(page.getByRole('button', { name: /post a service/i }))
    await safeClick(page.getByRole('menuitem', { name: /post an offer/i }))

    await expect(page.getByRole('heading', { name: /post a new offer/i })).toBeVisible({ timeout: 15000 })

    await page.getByTestId('post-offer-title').fill(title)
    await page.getByTestId('post-offer-description').fill('E2E-created offer (online)')
    await page.getByTestId('post-offer-participants').fill('1')

    await safeClick(page.getByTestId('post-offer-duration'))
    await safeClick(page.getByRole('option', { name: /1 hour/i }))

    const locationType = page.getByTestId('post-offer-location-type')
    await selectRadixOptionByName({ page, trigger: locationType, optionName: /^online$/i, timeout: 15000 })

    await expect
      .poll(async () => (await locationType.textContent())?.trim() ?? '')
      .toMatch(/online/i)
    await expect(page.getByText(/drag the pin to select location/i)).toBeHidden({ timeout: 10000 }).catch(() => {})
    
    // Configure a valid recurring schedule (defaults to recurrent).
    await safeClick(page.getByTestId('recurring-frequency'))
    // On mobile, Radix Select options can be "outside viewport"; use keyboard selection instead of clicking.
    await page.keyboard.press('ArrowDown').catch(() => {})
    await page.keyboard.press('Enter')

    const mon = page.getByRole('checkbox', { name: /^Mon$/i })
    const hasDaysOfWeek = await page.getByText(/days of week/i).isVisible({ timeout: 2000 }).catch(() => false)
    if (hasDaysOfWeek) {
      await mon.check({ force: true }).catch(async () => {
        await safeClick(mon)
      })
    }
    
    await safeClick(page.getByTestId('recurring-hour'))
    await page.keyboard.type('9').catch(() => {})
    await page.keyboard.press('Enter')
    
    await safeClick(page.getByTestId('recurring-minute'))
    await page.keyboard.type('00').catch(() => {})
    await page.keyboard.press('Enter')
    
    await safeClick(page.getByTestId('recurring-period'))
    await page.keyboard.type('am').catch(() => {})
    await page.keyboard.press('Enter')

    await safeClick(page.getByTestId('post-offer-submit'))

    await expect(page.getByRole('heading', { name: /browse services/i })).toBeVisible({ timeout: 20000 })

    const searchBox = page.getByRole('textbox', { name: /search services/i })
    await expect(searchBox).toBeVisible({ timeout: 20000 })
    await searchBox.fill(title)

    // Allow for cache TTL / polling interval variance across browsers and containers.
    // On mobile, results can be in an overflow container (clipped), so assert presence first.
    const createdCard = page.getByRole('button', { name: new RegExp(title) }).first()
    await expect(createdCard).toBeAttached({ timeout: 45000 })
    await createdCard.scrollIntoViewIfNeeded().catch(() => {})
    await expect(createdCard).toBeVisible({ timeout: 45000 })
  })
})
