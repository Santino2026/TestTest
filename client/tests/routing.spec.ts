import { test, expect } from '@playwright/test';

test.describe('Route Protection', () => {
  test.beforeEach(async ({ page }) => {
    // Clear tokens before each test
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
    });
  });

  test('unauthenticated user redirected from /games to /login', async ({ page }) => {
    await page.goto('/games');

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });

  test('unauthenticated user redirected from /basketball to /login', async ({ page }) => {
    await page.goto('/basketball');

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });

  test('unauthenticated user redirected from /basketball/select-team to /login', async ({ page }) => {
    await page.goto('/basketball/select-team');

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });

  test('unauthenticated user redirected from /basketball/teams to /login', async ({ page }) => {
    await page.goto('/basketball/teams');

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });

  test('unauthenticated user redirected from /basketball/players to /login', async ({ page }) => {
    await page.goto('/basketball/players');

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });

  test('unauthenticated user redirected from /basketball/standings to /login', async ({ page }) => {
    await page.goto('/basketball/standings');

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });

  test('unauthenticated user redirected from /basketball/schedule to /login', async ({ page }) => {
    await page.goto('/basketball/schedule');

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });

  test('public routes accessible without auth', async ({ page }) => {
    // Landing page
    await page.goto('/');
    await expect(page).toHaveURL('/');
    await expect(page.locator('header >> text=Sports League Office')).toBeVisible();

    // Login page
    await page.goto('/login');
    await expect(page).toHaveURL('/login');

    // Signup page
    await page.goto('/signup');
    await expect(page).toHaveURL('/signup');
  });
});
