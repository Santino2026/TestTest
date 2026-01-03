import { test, expect } from '@playwright/test';

test.describe('Mobile Responsiveness', () => {
  test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE size

  test('landing page renders on mobile', async ({ page }) => {
    await page.goto('/');

    // Logo visible (use header to avoid footer match)
    await expect(page.locator('header >> text=Sports League Office')).toBeVisible();

    // CTA button visible and clickable
    const getStarted = page.locator('text=Get Started').first();
    await expect(getStarted).toBeVisible();

    // Login/signup buttons visible
    await expect(page.locator('button:has-text("Login")')).toBeVisible();
    await expect(page.locator('button:has-text("Sign Up")')).toBeVisible();
  });

  test('login page usable on mobile', async ({ page }) => {
    await page.goto('/login');

    // Form elements visible
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();

    // Check button has minimum touch target (44px)
    const submitBtn = page.locator('button[type="submit"]');
    const box = await submitBtn.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(44);
  });

  test('signup page usable on mobile', async ({ page }) => {
    await page.goto('/signup');

    // All form fields visible
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[placeholder="At least 6 characters"]')).toBeVisible();
    await expect(page.locator('input[placeholder="Confirm your password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();

    // Check button has minimum touch target
    const submitBtn = page.locator('button[type="submit"]');
    const box = await submitBtn.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(44);
  });

  test('no horizontal overflow on landing page', async ({ page }) => {
    await page.goto('/');

    // Check page doesn't overflow horizontally
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1); // +1 for rounding
  });

  test('no horizontal overflow on login page', async ({ page }) => {
    await page.goto('/login');

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
  });
});
