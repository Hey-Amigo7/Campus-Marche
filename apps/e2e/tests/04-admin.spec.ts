import { test, expect, type Page } from '@playwright/test';

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'admin@campus-marche.com';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? '';

async function loginAsAdmin(page: Page) {
  await page.goto('/admin/login');
  await page.getByPlaceholder('admin@campus-marche.com').fill(ADMIN_EMAIL);
  await page.getByPlaceholder('••••••••').fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: /sign in to admin/i }).click();
  await expect(page).toHaveURL(/\/admin($|\?)/, { timeout: 15_000 });
}

test.describe('Admin panel', () => {
  test.beforeEach(async ({}, testInfo) => {
    if (!ADMIN_PASSWORD) testInfo.skip();
  });

  test('admin dashboard shows overview tab by default', async ({ page }) => {
    await loginAsAdmin(page);
    // Overview / stats section should be visible
    await expect(
      page.getByText(/overview|total users|total listings/i).first(),
    ).toBeVisible({ timeout: 15_000 });
  });

  test('admin can switch to Users tab', async ({ page }) => {
    await loginAsAdmin(page);
    const usersTab = page.getByRole('button', { name: /users/i }).first();
    await usersTab.click();
    // Users table or empty state
    await expect(
      page.getByText(/users|no users/i).first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('admin can switch to Listings tab', async ({ page }) => {
    await loginAsAdmin(page);
    const listingsTab = page.getByRole('button', { name: /listings/i }).first();
    await listingsTab.click();
    await expect(
      page.getByText(/listing|no listings/i).first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('admin can switch to Messages tab', async ({ page }) => {
    await loginAsAdmin(page);
    const messagesTab = page.getByRole('button', { name: /messages/i }).first();
    await messagesTab.click();
    await expect(
      page.getByText(/message|contact|no messages/i).first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('admin panel blocks unauthenticated access', async ({ page }) => {
    // Visiting /admin without logging in should redirect
    await page.goto('/admin');
    // Either redirected to admin login or shows unauthorised
    await expect(
      page.getByText(/sign in|login|unauthori/i).first(),
    ).toBeVisible({ timeout: 10_000 });
  });
});
