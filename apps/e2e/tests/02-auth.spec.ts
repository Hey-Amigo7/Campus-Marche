import { test, expect } from '@playwright/test';

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'admin@campus-marche.com';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? '';
const USER_EMAIL = process.env.E2E_USER_EMAIL ?? '';
const USER_PASSWORD = process.env.E2E_USER_PASSWORD ?? '';

test.describe('Authentication', () => {
  test('login with wrong password shows error', async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder(/you@htu/i).fill('wrong@example.com');
    await page.getByPlaceholder('••••••••').fill('wrongpassword');
    await page.getByRole('button', { name: /sign in/i }).click();
    // Error message should appear (any non-empty error text)
    await expect(
      page.locator('p.text-red-600, p[style*="red"], [class*="error"]').first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('admin login with wrong credentials shows error', async ({ page }) => {
    await page.goto('/admin/login');
    await page.getByPlaceholder('admin@campus-marche.com').fill('wrong@admin.com');
    await page.getByPlaceholder('••••••••').fill('wrongpassword');
    await page.getByRole('button', { name: /sign in to admin/i }).click();
    await expect(
      page.getByText(/invalid|incorrect|failed|wrong/i).first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('admin login with correct credentials reaches dashboard', async ({ page }) => {
    test.skip(!ADMIN_PASSWORD, 'E2E_ADMIN_PASSWORD not set');

    await page.goto('/admin/login');
    await page.getByPlaceholder('admin@campus-marche.com').fill(ADMIN_EMAIL);
    await page.getByPlaceholder('••••••••').fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: /sign in to admin/i }).click();

    // Should land on /admin
    await expect(page).toHaveURL(/\/admin($|\?)/, { timeout: 15_000 });
    // Dashboard tab navigation visible
    await expect(page.getByText(/overview|users|listings/i).first()).toBeVisible();
  });

  test('user login with correct credentials reaches profile', async ({ page }) => {
    test.skip(!USER_EMAIL || !USER_PASSWORD, 'E2E_USER_EMAIL / E2E_USER_PASSWORD not set');

    await page.goto('/login');
    await page.getByPlaceholder(/you@htu/i).fill(USER_EMAIL);
    await page.getByPlaceholder('••••••••').fill(USER_PASSWORD);
    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(page).toHaveURL(/\/profile/, { timeout: 15_000 });
  });

  test('protected pages redirect unauthenticated users', async ({ page }) => {
    // Visit a protected route without being logged in
    await page.goto('/sell');
    // Should redirect to login
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });
});
