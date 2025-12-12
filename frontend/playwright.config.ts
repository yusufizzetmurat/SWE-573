import { defineConfig, devices } from '@playwright/test';

const isTruthy = (value: unknown) => ['1', 'true', 'yes', 'y', 'on'].includes(String(value ?? '').trim().toLowerCase());

const workersFromEnv = process.env.PLAYWRIGHT_WORKERS ? Number(process.env.PLAYWRIGHT_WORKERS) : undefined;
const e2eBackendEnabled = isTruthy(process.env.DJANGO_E2E ?? process.env.E2E);
const defaultWorkers = process.env.CI ? 1 : e2eBackendEnabled ? 4 : 1;

export default defineConfig({
  testDir: './tests/e2e',
  globalSetup: './tests/e2e/global-setup',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: workersFromEnv ?? defaultWorkers,
  reporter: [
    ['html', { outputFolder: './tests/reports/e2e', open: 'never' }],
    ['list'],
    ['json', { outputFile: './tests/reports/e2e/results.json' }],
    ['junit', { outputFile: './tests/reports/e2e/junit.xml' }],
  ],
  timeout: 60000,
  expect: {
    timeout: 10000,
  },
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], storageState: 'tests/e2e/.auth/chromium.json' },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'], storageState: 'tests/e2e/.auth/firefox.json' },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'], storageState: 'tests/e2e/.auth/webkit.json' },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'], storageState: 'tests/e2e/.auth/mobile-chrome.json' },
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 12'], storageState: 'tests/e2e/.auth/mobile-safari.json' },
    },
  ],
});

