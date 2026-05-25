import { test, expect } from '@playwright/test';

test.describe('Marketplace', () => {
  test('homepage hero section renders', async ({ page }) => {
    await page.goto('/');
    // Hero / main CTA visible
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('search navigates to results page', async ({ page }) => {
    await page.goto('/');
    // Find search input in the navbar/hero
    const searchInput = page.getByPlaceholder(/search/i).first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('textbook');
      await searchInput.press('Enter');
      await expect(page).toHaveURL(/\/search/, { timeout: 10_000 });
    } else {
      // Navigate directly
      await page.goto('/search?q=textbook');
      await expect(page).toHaveTitle(/campus marche/i);
    }
  });

  test('products page shows correct page structure', async ({ page }) => {
    await page.goto('/products');
    // Page should have a main content area
    await expect(page.locator('main, [role="main"]').first()).toBeVisible();
  });

  test('category browsing works', async ({ page }) => {
    await page.goto('/categories');
    // Category links should be visible
    const categories = page.locator('a[href*="/products?category"], a[href*="/categories/"]');
    const count = await categories.count();
    if (count > 0) {
      await categories.first().click();
      await expect(page).toHaveURL(/products|categories/);
    }
  });

  test('product detail page loads when product exists', async ({ page }) => {
    // Go to products and click the first one if any exist
    await page.goto('/products');
    await page.waitForLoadState('networkidle');

    const productLinks = page.locator('a[href*="/products/"]');
    const count = await productLinks.count();

    if (count > 0) {
      await productLinks.first().click();
      await expect(page).toHaveURL(/\/products\/[^/]+$/);
      // Title and price should be visible
      await expect(page.locator('h1, h2').first()).toBeVisible();
    } else {
      // No products yet — just verify the empty state renders
      await expect(page.getByText(/no listings|empty/i).first()).toBeVisible({ timeout: 15_000 });
    }
  });

  test('events page loads', async ({ page }) => {
    await page.goto('/events');
    await expect(page).toHaveTitle(/campus marche/i);
  });

  test('deals page loads', async ({ page }) => {
    await page.goto('/deals');
    await expect(page).toHaveTitle(/campus marche/i);
  });

  test('premium page loads', async ({ page }) => {
    await page.goto('/premium');
    await expect(page).toHaveTitle(/campus marche/i);
  });
});
