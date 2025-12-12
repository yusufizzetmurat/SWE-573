import fs from 'node:fs/promises';
import path from 'node:path';

import { chromium, expect, type FullConfig } from '@playwright/test';

const STORAGE_STATES: Array<{ path: string; email: string; password: string }> = [
  { path: 'tests/e2e/.auth/chromium.json', email: 'elif@demo.com', password: 'demo123' },
  { path: 'tests/e2e/.auth/firefox.json', email: 'cem@demo.com', password: 'demo123' },
  { path: 'tests/e2e/.auth/webkit.json', email: 'ayse@demo.com', password: 'demo123' },
  { path: 'tests/e2e/.auth/mobile-chrome.json', email: 'mehmet@demo.com', password: 'demo123' },
  { path: 'tests/e2e/.auth/mobile-safari.json', email: 'zeynep@demo.com', password: 'demo123' },
];

const BASE_AUTH = STORAGE_STATES[0]!;

const API_BASE_URL = process.env.PLAYWRIGHT_API_BASE_URL || 'http://localhost:8000/api';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function waitForOk(url: string, { timeoutMs, intervalMs }: { timeoutMs: number; intervalMs: number }) {
  const startedAt = Date.now();
  let lastError: unknown;

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const res = await fetch(url, { method: 'GET' });
      if (res.ok) return;
      lastError = new Error(`Non-2xx response: ${res.status}`);
    } catch (err) {
      lastError = err;
    }
    await sleep(intervalMs);
  }

  throw new Error(`Timed out waiting for ${url} to become ready. Last error: ${String(lastError)}`);
}

async function loginAndWriteState(params: {
  browser: Awaited<ReturnType<typeof chromium.launch>>;
  baseURL: string;
  email: string;
  password: string;
  statePath: string;
}) {
  const { browser, baseURL, email, password, statePath } = params;

  const loginResponse = await fetch(`${API_BASE_URL}/auth/login/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!loginResponse.ok) {
    const text = await loginResponse.text();
    throw new Error(`Playwright global setup login failed for ${email}: ${loginResponse.status} ${text}`);
  }

  const loginData = (await loginResponse.json()) as { access?: string; refresh?: string; user?: unknown };
  if (!loginData.access || !loginData.refresh || !loginData.user) {
    throw new Error(`Playwright global setup login response missing fields for ${email}`);
  }

  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(baseURL);
  await page.evaluate(
    ({ access, refresh, user }) => {
      localStorage.setItem('access_token', access);
      localStorage.setItem('refresh_token', refresh);
      localStorage.setItem('user_data', JSON.stringify(user));
    },
    { access: loginData.access, refresh: loginData.refresh, user: loginData.user }
  );

  await page.goto(`${baseURL}/dashboard`);
  await expect(page.getByRole('heading', { name: /browse services/i })).toBeVisible({ timeout: 20000 });
  await context.storageState({ path: statePath });
  await context.close();
}

export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use?.baseURL as string | undefined;
  if (!baseURL) {
    throw new Error('Playwright baseURL is not configured');
  }

  const authDir = path.posix.join('tests', 'e2e', '.auth');

  // Always regenerate auth state each run to avoid stale JWTs after DB resets/reseeds.
  await fs.rm(authDir, { recursive: true, force: true });
  await fs.mkdir(authDir, { recursive: true });

  await waitForOk(`${API_BASE_URL}/health/`, { timeoutMs: 60_000, intervalMs: 1_000 });
  await waitForOk(baseURL, { timeoutMs: 60_000, intervalMs: 1_000 });

  const browser = await chromium.launch();

  for (const state of STORAGE_STATES) {
    await loginAndWriteState({
      browser,
      baseURL,
      email: state.email,
      password: state.password,
      statePath: state.path,
    });

    // Avoid bursty auth requests during setup.
    await sleep(350);
  }

  await browser.close();
}
