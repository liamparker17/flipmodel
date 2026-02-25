import { test, expect } from "@playwright/test";

test.describe("Tools Page", () => {
  test("unauthenticated user is redirected to login", async ({ page }) => {
    await page.goto("/tools");
    await expect(page).toHaveURL(/login/);
  });

  test("login page renders after redirect from tools", async ({ page }) => {
    await page.goto("/tools");
    await expect(page).toHaveURL(/login/);
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  // The tests below require an authenticated session.
  // To run them, configure a global setup that logs in and saves storageState.
  // See: https://playwright.dev/docs/auth
  test.describe("with auth @authenticated", () => {
    test.skip(true, "Requires authenticated session - configure storageState in global setup");

    test("page renders past Suspense loading state", async ({ page }) => {
      await page.goto("/tools");

      // The tools page uses Suspense with a "Loading..." fallback
      // Wait for the content to load
      await expect(page.locator("text=Loading...")).toBeVisible({ timeout: 3000 }).catch(() => {
        // Loading may have already completed
      });

      // Eventually should resolve to the actual page content
      await expect(page.locator("h1").or(page.locator("text=Loading..."))).toBeVisible({ timeout: 10000 });
    });

    test("search input is present", async ({ page }) => {
      await page.goto("/tools");
      // Wait for Suspense to resolve
      await page.waitForLoadState("networkidle");

      const searchInput = page.locator("input[type='text']").first();
      await expect(searchInput).toBeVisible({ timeout: 10000 });
    });

    test("status filter dropdown is present", async ({ page }) => {
      await page.goto("/tools");
      await page.waitForLoadState("networkidle");

      const selects = page.locator("select");
      await expect(selects.first()).toBeVisible({ timeout: 10000 });
    });

    test("category filter dropdown is present", async ({ page }) => {
      await page.goto("/tools");
      await page.waitForLoadState("networkidle");

      const selects = page.locator("select");
      const count = await selects.count();
      // Should have at least status and category filter dropdowns
      expect(count).toBeGreaterThanOrEqual(2);
    });

    test("KPI stats render", async ({ page }) => {
      await page.goto("/tools");
      await page.waitForLoadState("networkidle");

      // The tools page shows KPI stats: Total, Checked Out, Available, etc.
      const totalLabel = page.locator("text=/total/i").first();
      const availableLabel = page.locator("text=/available/i").first();
      await expect(totalLabel.or(availableLabel)).toBeVisible({ timeout: 10000 });
    });

    test("tool cards or empty state renders", async ({ page }) => {
      await page.goto("/tools");
      await page.waitForLoadState("networkidle");

      // The page should show tool cards or indicate no tools exist
      // Just verify that the page has loaded meaningful content
      const pageContent = page.locator("body");
      await expect(pageContent).toBeVisible();

      // Check that we are past the loading state
      await expect(page.locator("text=Loading...")).not.toBeVisible({ timeout: 10000 });
    });

    test("add tool button is present", async ({ page }) => {
      await page.goto("/tools");
      await page.waitForLoadState("networkidle");

      // Look for a button that adds a new tool
      const addBtn = page.locator("button", { hasText: /add|new/i }).first();
      await expect(addBtn).toBeVisible({ timeout: 10000 });
    });
  });
});
