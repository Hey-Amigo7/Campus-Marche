import { test, expect } from '@playwright/test';

test.describe('Public pages', () => {
  test('homepage loads with correct title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Campus Marche/);
    // Navbar brand name visible
    await expect(page.getByText('Campus Marche').first()).toBeVisible();
  });

  test('homepage shows live feed section', async ({ page }) => {
    await page.goto('/');
    // Either products grid or empty state — either way the page renders
    await expect(
      page.getByText(/live feed|no listings yet/i).first(),
    ).toBeVisible({ timeout: 20_000 });
  });

  test('login page renders form', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
    await expect(page.getByPlaceholder(/you@htu/i)).toBeVisible();
    await expect(page.getByPlaceholder('••••••••')).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /register/i })).toBeVisible();
  });

  test('register page renders form', async ({ page }) => {
    await page.goto('/register');
    await expect(page.getByRole('heading', { name: /join campus marche/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /create account/i })).toBeVisible();
  });

  test('products page loads', async ({ page }) => {
    await page.goto('/products');
    await expect(page).toHaveTitle(/campus marche/i);
    // Wait for either product cards or empty state
    await expect(
      page.getByText(/product|listing|no items/i).first(),
    ).toBeVisible({ timeout: 20_000 });
  });

  test('categories page loads', async ({ page }) => {
    await page.goto('/categories');
    await expect(page).toHaveTitle(/campus marche/i);
  });

  test('search page loads', async ({ page }) => {
    await page.goto('/search');
    await expect(page).toHaveTitle(/campus marche/i);
  });

  test('contact page renders form', async ({ page }) => {
    await page.goto('/contact');
    await expect(page.getByRole('heading', { name: /contact/i })).toBeVisible();
  });

  test('about page loads', async ({ page }) => {
    await page.goto('/about');
    await expect(page).toHaveTitle(/campus marche/i);
  });

  test('admin login page renders', async ({ page }) => {
    await page.goto('/admin/login');
    await expect(page.getByText(/admin portal/i)).toBeVisible();
    await expect(page.getByPlaceholder('admin@campus-marche.com')).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in to admin/i })).toBeVisible();
  });
});
