import { test, expect } from "@playwright/test";

test.describe("Navigation", () => {
  test("login page has correct title elements", async ({ page }) => {
    await page.goto("/login");
    // Should have form elements
    await expect(page.locator("form")).toBeVisible();
  });

  test("signup page has correct form elements", async ({ page }) => {
    await page.goto("/signup");
    await expect(page.locator("form")).toBeVisible();
    // Should have name, email, password fields
    const inputs = page.locator("input");
    await expect(inputs).toHaveCount(3); // name, email, password (at minimum)
  });

  test("protected routes redirect to login", async ({ page }) => {
    const protectedRoutes = [
      "/dashboard",
      "/pipeline",
      "/projects",
      "/contacts",
      "/finance",
      "/invoices",
      "/tools",
      "/reports",
      "/settings",
    ];

    for (const route of protectedRoutes) {
      await page.goto(route);
      await expect(page).toHaveURL(/login/, {
        timeout: 5000,
      });
    }
  });
});
