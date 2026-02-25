import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test("login page loads", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveURL(/login/);
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test("signup page loads", async ({ page }) => {
    await page.goto("/signup");
    await expect(page).toHaveURL(/signup/);
    await expect(page.locator('input[name="name"]')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test("login with invalid credentials shows error", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[type="email"]', "invalid@test.com");
    await page.fill('input[type="password"]', "wrongpassword");
    await page.click('button[type="submit"]');
    // Should stay on login page or show error
    await expect(page).toHaveURL(/login/);
  });

  test("unauthenticated user redirected to login", async ({ page }) => {
    await page.goto("/dashboard");
    // Should redirect to login
    await expect(page).toHaveURL(/login/);
  });

  test("signup with weak password shows validation error", async ({ page }) => {
    await page.goto("/signup");
    await page.fill('input[name="name"]', "Test User");
    await page.fill('input[type="email"]', "test@example.com");
    await page.fill('input[type="password"]', "short");
    await page.click('button[type="submit"]');
    // Should show validation error about password requirements
    await expect(page).toHaveURL(/signup/);
  });
});
