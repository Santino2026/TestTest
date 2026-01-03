import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any stored tokens
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
    });
  });

  test('landing page loads', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('header >> text=Sports League Office')).toBeVisible();
    await expect(page.locator('text=Get Started').first()).toBeVisible();
  });

  test('login page loads', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('text=Welcome Back')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('signup page loads', async ({ page }) => {
    await page.goto('/signup');
    await expect(page.locator('text=Create Your Account')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[placeholder="At least 6 characters"]')).toBeVisible();
  });

  test('login form shows error on invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'fake@test.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    // Should show error message (could be "Invalid" or "Failed" or other error text)
    await expect(page.locator('[class*="red"]')).toBeVisible({ timeout: 5000 });
  });

  test('signup form validates password length', async ({ page }) => {
    await page.goto('/signup');
    await page.fill('input[type="email"]', 'test@test.com');
    await page.fill('input[placeholder="At least 6 characters"]', '123');
    await page.fill('input[placeholder="Confirm your password"]', '123');
    await page.click('button[type="submit"]');

    // Should show password length error
    await expect(page.locator('text=at least 6 characters')).toBeVisible();
  });

  test('signup form validates password match', async ({ page }) => {
    await page.goto('/signup');
    await page.fill('input[type="email"]', 'test@test.com');
    await page.fill('input[placeholder="At least 6 characters"]', 'password123');
    await page.fill('input[placeholder="Confirm your password"]', 'different123');
    await page.click('button[type="submit"]');

    // Should show password mismatch error
    await expect(page.locator('text=do not match')).toBeVisible();
  });
});
