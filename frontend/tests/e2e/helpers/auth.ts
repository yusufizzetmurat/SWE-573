import { expect, Page } from '@playwright/test';

export const DEMO_USERS = {
  elif: { email: 'elif@demo.com', password: 'demo123', name: 'Elif' },
  cem: { email: 'cem@demo.com', password: 'demo123', name: 'Cem' },
  sarah: { email: 'sarah@demo.com', password: 'demo123', name: 'Sarah' },
  marcus: { email: 'marcus@demo.com', password: 'demo123', name: 'Marcus' },
  alex: { email: 'alex@demo.com', password: 'demo123', name: 'Alex' },
  ayse: { email: 'ayse@demo.com', password: 'demo123', name: 'Ayşe' },
} as const;

export type DemoUser = keyof typeof DEMO_USERS;

export async function login(page: Page, user: DemoUser = 'elif') {
  const creds = DEMO_USERS[user];
  await page.goto('/');
  await page.getByRole('button', { name: /log in/i }).first().click();

  // Prefer accessible labels, but keep name selectors as fallback.
  const email = page.getByLabel(/email/i);
  const password = page.getByLabel(/password/i);

  if (await email.isVisible().catch(() => false)) {
    await email.fill(creds.email);
  } else {
    await page.fill('input[name="email"]', creds.email);
  }

  if (await password.isVisible().catch(() => false)) {
    await password.fill(creds.password);
  } else {
    await page.fill('input[name="password"]', creds.password);
  }

  await page.getByRole('button', { name: /^log in$/i }).click();
  await expect(page.getByRole('heading', { name: /browse services/i })).toBeVisible({ timeout: 15000 });
}

export async function logout(page: Page) {
  // Profile menu button is the amber avatar circle in Navbar.
  const trigger = page.getByTestId('navbar-user-menu').first().or(page.locator('nav button.bg-amber-100').first());
  await trigger.scrollIntoViewIfNeeded().catch(() => {});

  await trigger.tap({ timeout: 3000 }).catch(async () => {
    await trigger.click({ timeout: 3000 }).catch(async () => {
      await trigger.click({ timeout: 15000, force: true });
    });
  });

  const logoutItem = page.getByRole('menuitem', { name: /log out/i });
  await logoutItem.scrollIntoViewIfNeeded().catch(() => {});
  await logoutItem.tap({ timeout: 3000 }).catch(async () => {
    await logoutItem.click({ timeout: 3000 }).catch(async () => {
      await logoutItem.click({ timeout: 15000, force: true });
    });
  });
  await expect(page.getByRole('button', { name: /log in/i }).first()).toBeVisible({ timeout: 10000 });
}
