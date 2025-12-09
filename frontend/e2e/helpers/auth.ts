import { Page, expect } from '@playwright/test';

export const DEMO_USERS = {
  elif: { email: 'elif@demo.com', password: 'demo123', name: 'Elif' },
  cem: { email: 'cem@demo.com', password: 'demo123', name: 'Cem' },
  sarah: { email: 'sarah@demo.com', password: 'demo123', name: 'Sarah' },
  marcus: { email: 'marcus@demo.com', password: 'demo123', name: 'Marcus' },
  alex: { email: 'alex@demo.com', password: 'demo123', name: 'Alex' },
  ayse: { email: 'ayse@demo.com', password: 'demo123', name: 'Ayşe' },
} as const;

export type DemoUser = keyof typeof DEMO_USERS;

export async function login(page: Page, user: DemoUser | { email: string; password: string }) {
  const credentials = typeof user === 'string' ? DEMO_USERS[user] : user;
  
  await page.goto('/');
  await page.getByRole('button', { name: /log in/i }).first().click();
  await page.getByLabel(/email/i).fill(credentials.email);
  await page.getByLabel(/password/i).fill(credentials.password);
  await page.getByRole('button', { name: /log in/i }).click();
  await expect(page.getByRole('heading', { name: /browse services/i })).toBeVisible({ timeout: 15000 });
}

export async function logout(page: Page) {
  await page.locator('nav button.bg-amber-100').click();
  await page.getByRole('menuitem', { name: /log out/i }).click();
  await expect(page.getByRole('button', { name: /log in/i }).first()).toBeVisible({ timeout: 10000 });
}

export async function switchUser(page: Page, newUser: DemoUser) {
  await logout(page);
  await login(page, newUser);
}

export function generateTestEmail(): string {
  return `test_${Date.now()}_${Math.random().toString(36).substring(7)}@test.com`;
}
