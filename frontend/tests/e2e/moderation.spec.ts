/**
 * E2E tests for user reporting + moderator review workflows.
 *
 * Important: this spec intentionally does UI login per test (no storageState).
 */
import { test, expect, type APIRequestContext, type Locator, type Page } from '@playwright/test'

import { login, logout } from './helpers/auth'

type StorageState = {
  cookies: Array<{
    name: string
    value: string
    domain: string
    path: string
    expires: number
    httpOnly: boolean
    secure: boolean
    sameSite: 'Strict' | 'Lax' | 'None'
  }>
  origins: Array<{
    origin: string
    localStorage: Array<{ name: string; value: string }>
  }>
}

const loggedOutState: StorageState = { cookies: [], origins: [] }
const API_BASE_URL = process.env.PLAYWRIGHT_API_BASE_URL || 'http://localhost:8000/api'

async function openReportDialog(page: Page) {
  const trigger = page.getByRole('button', { name: /^report this listing$/i })
  await expect(trigger).toBeVisible({ timeout: 20000 })

  const dialogContent = page.locator('[data-slot="dialog-content"]').first()

  // Mobile Safari can occasionally miss the first tap/click; retry a few times.
  for (let attempt = 0; attempt < 3; attempt++) {
    await safeClick(trigger)
    const opened = await dialogContent.isVisible({ timeout: 1500 }).catch(() => false)
    if (opened) return dialogContent
    await page.waitForTimeout(250)
  }

  // Final wait with full timeout for slower devices.
  await expect(dialogContent).toBeVisible({ timeout: 15000 })
  return dialogContent
}

async function safeClick(locator: Locator, options?: { timeout?: number }) {
  const timeout = options?.timeout ?? 15000
  const fastTimeout = Math.min(3000, timeout)
  await locator.scrollIntoViewIfNeeded().catch(() => {})
  // Mobile projects can be sensitive to click vs touch; prefer tap first.
  await locator.tap({ timeout: fastTimeout }).catch(async () => {
    await locator.click({ timeout: fastTimeout }).catch(async () => {
      await locator.click({ timeout, force: true })
    })
  })
}

async function apiLogin(request: APIRequestContext, email: string, password: string) {
  const res = await request.post(`${API_BASE_URL}/auth/login/`, {
    data: { email, password },
  })
  expect(res.ok()).toBeTruthy()
  const json = (await res.json()) as { access?: string }
  expect(json.access).toBeTruthy()
  return json.access!
}

async function apiCreateService(request: APIRequestContext, params: { email: string; password: string; title: string }) {
  const access = await apiLogin(request, params.email, params.password)
  const res = await request.post(`${API_BASE_URL}/services/`, {
    headers: {
      Authorization: `Bearer ${access}`,
      'Content-Type': 'application/json',
    },
    data: {
      title: params.title,
      description: 'E2E-created service for moderation workflow',
      type: 'Offer',
      duration: 1.0,
      location_type: 'In-Person',
      location_area: 'Beşiktaş',
      location_lat: 41.0422,
      location_lng: 29.0089,
      max_participants: 1,
      schedule_type: 'One-Time',
      status: 'Active',
    },
  })

  if (!res.ok()) {
    throw new Error(`Failed to create service via API: ${res.status()} ${await res.text()}`)
  }

  const json = (await res.json()) as { id: string }
  expect(json.id).toBeTruthy()
  return json.id
}

async function apiCreateNoShowDispute(args: {
  request: APIRequestContext
  requesterEmail: string
  requesterPassword: string
  serviceId: string
  description: string
}) {
  const access = await apiLogin(args.request, args.requesterEmail, args.requesterPassword)

  const interestRes = await args.request.post(`${API_BASE_URL}/services/${args.serviceId}/interest/`, {
    headers: { Authorization: `Bearer ${access}` },
  })
  if (interestRes.status() !== 201) {
    throw new Error(`Failed to express interest: ${interestRes.status()} ${await interestRes.text()}`)
  }

  const handshakeJson = (await interestRes.json()) as { id?: string }
  const handshakeId = handshakeJson.id
  if (!handshakeId) {
    throw new Error('Interest response missing handshake id')
  }

  const reportRes = await args.request.post(`${API_BASE_URL}/handshakes/${handshakeId}/report/`, {
    headers: {
      Authorization: `Bearer ${access}`,
      'Content-Type': 'application/json',
    },
    data: { issue_type: 'no_show', description: args.description },
  })

  if (reportRes.status() !== 201) {
    throw new Error(`Failed to create no-show report: ${reportRes.status()} ${await reportRes.text()}`)
  }
}

test.describe('Moderation (UI login per test)', () => {
  // Override project storageState so every test starts logged out.
  test.use({ storageState: loggedOutState })

  test('user can report listing; moderator can see it; dispute modal is usable', async ({ page, request }) => {
    test.setTimeout(180000)

    // Create a fresh service owned by a different user, so we can report it deterministically.
    const serviceTitle = `E2E Moderation Service ${Date.now()}`
    const serviceId = await apiCreateService(request, { email: 'cem@demo.com', password: 'demo123', title: serviceTitle })

    // --- User flow: report listing from ServiceDetail ---
    await login(page, 'elif')

    await page.goto(`/service-detail/${serviceId}`)
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 20000 })

    const dialog = await openReportDialog(page)

    // Select "Spam" option then submit.
    await safeClick(dialog.getByRole('radio', { name: /spam/i }))
    await safeClick(dialog.getByRole('button', { name: /submit report/i }))

    await expect(page.getByText('Report submitted. Thanks for helping keep the community safe.')).toBeVisible({ timeout: 15000 })

    const alreadyReported = page.getByRole('button', { name: /already reported/i })
    await expect(alreadyReported).toBeVisible({ timeout: 15000 })
    await expect(alreadyReported).toBeDisabled()

    // --- Duplicate-report prevention (end-to-end) ---
    // The UI prevents re-reporting via localStorage; clear that flag to force a second submit.
    // Backend should reject it, and UI should lock back down.
    await page.evaluate(() => {
      try {
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const key = localStorage.key(i)
          if (key && key.startsWith('reportedService:')) {
            localStorage.removeItem(key)
          }
        }
      } catch {
        // ignore
      }
    })

    await page.reload()
    const dialogAgain = await openReportDialog(page)
    await safeClick(dialogAgain.getByRole('radio', { name: /spam/i }))
    await safeClick(dialogAgain.getByRole('button', { name: /submit report/i }))

    await expect(
      page.getByText('You have already reported this listing. Moderators are reviewing your report.')
    ).toBeVisible({ timeout: 15000 })
    await expect(page.getByRole('button', { name: /already reported/i })).toBeVisible({ timeout: 15000 })
    await expect(page.getByRole('button', { name: /already reported/i })).toBeDisabled()

    // --- Moderator flow: verify the report appears in Reports Queue ---
    await logout(page)
    await login(page, 'moderator')

    await page.goto('/admin')
    await expect(page.getByRole('heading', { name: /the hive moderator dashboard/i })).toBeVisible({ timeout: 20000 })

    await safeClick(page.getByRole('button', { name: /reports queue/i }))
    await safeClick(page.getByRole('button', { name: /content reports/i }))

    await expect(page.getByText(serviceTitle).first()).toBeVisible({ timeout: 30000 })
    await expect(page.getByText(/spam or misleading listing/i).first()).toBeVisible({ timeout: 30000 })

    // --- Create a no-show dispute via API, then resolve it via the modal ---
    const disputeDescription = `E2E no-show dispute ${Date.now()}`
    await apiCreateNoShowDispute({
      request,
      requesterEmail: 'elif@demo.com',
      requesterPassword: 'demo123',
      serviceId,
      description: disputeDescription,
    })

    // Re-enter reports section to ensure fresh fetch.
    await safeClick(page.getByRole('button', { name: /^dashboard$/i }))
    await safeClick(page.getByRole('button', { name: /reports queue/i }))
    await safeClick(page.getByRole('button', { name: /timebank disputes/i }))

    await expect(page.getByText(disputeDescription).first()).toBeVisible({ timeout: 30000 })

    // Pause first (if available)
    const disputeCard = page
      .locator('main div.bg-white.rounded-xl.border')
      .filter({ has: page.getByText(disputeDescription) })
      .first()

    const pauseButton = disputeCard.getByRole('button', { name: /^pause$/i })
    if (await pauseButton.isVisible().catch(() => false)) {
      await safeClick(pauseButton)
      await expect(page.getByText('Handshake has been paused for investigation')).toBeVisible({ timeout: 20000 })
    }

    // Open dispute modal and confirm no-show
    await safeClick(disputeCard.getByRole('button', { name: /^confirm no-show$/i }))
    await expect(page.getByRole('heading', { name: /resolve timebank dispute/i })).toBeVisible({ timeout: 15000 })

    const overlay = page.locator('div.fixed.inset-0').filter({ has: page.getByRole('heading', { name: /resolve timebank dispute/i }) })
    await safeClick(overlay.getByRole('button', { name: /confirm no-show/i }))
    await safeClick(overlay.getByRole('button', { name: /confirm resolution/i }))

    await expect(page.getByText('No-show confirmed. TimeBank dispute resolved.')).toBeVisible({ timeout: 30000 })
  })
})
