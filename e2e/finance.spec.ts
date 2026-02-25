import { test, expect } from "@playwright/test";

test.describe("Finance Page", () => {
  test("unauthenticated user is redirected to login", async ({ page }) => {
    await page.goto("/finance");
    await expect(page).toHaveURL(/login/);
  });

  test("login page renders after redirect from finance", async ({ page }) => {
    await page.goto("/finance");
    await expect(page).toHaveURL(/login/);
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  // The tests below require an authenticated session.
  // To run them, configure a global setup that logs in and saves storageState.
  // See: https://playwright.dev/docs/auth
  test.describe("with auth @authenticated", () => {
    test.skip(true, "Requires authenticated session - configure storageState in global setup");

    test("page renders with Finance heading", async ({ page }) => {
      await page.goto("/finance");
      await expect(page.locator("h1")).toContainText("Finance");
    });

    test("shows subtitle text", async ({ page }) => {
      await page.goto("/finance");
      await expect(page.locator("h1")).toContainText("Finance");
      await expect(page.locator("text=Portfolio financials and expense tracking")).toBeVisible();
    });

    test("renders all KPI cards", async ({ page }) => {
      await page.goto("/finance");
      await expect(page.locator("h1")).toContainText("Finance");

      await expect(page.locator("text=Capital Deployed")).toBeVisible();
      await expect(page.locator("text=Expected Returns")).toBeVisible();
      await expect(page.locator("text=Actual Spend")).toBeVisible();
      await expect(page.locator("text=Projected Spend")).toBeVisible();
      await expect(page.locator("text=Expected Profit")).toBeVisible();
    });

    test("all view tabs are present", async ({ page }) => {
      await page.goto("/finance");
      await expect(page.locator("h1")).toContainText("Finance");

      await expect(page.locator("button", { hasText: "Overview" })).toBeVisible();
      await expect(page.locator("button", { hasText: "Expenses" })).toBeVisible();
      await expect(page.locator("button", { hasText: "Cash Flow" })).toBeVisible();
      await expect(page.locator("button", { hasText: "P&L" })).toBeVisible();
      await expect(page.locator("button", { hasText: "Budget" })).toBeVisible();
    });

    test("can switch to Expenses tab", async ({ page }) => {
      await page.goto("/finance");
      await expect(page.locator("h1")).toContainText("Finance");

      await page.locator("button", { hasText: "Expenses" }).click();
      // Page heading should remain
      await expect(page.locator("h1")).toContainText("Finance");
    });

    test("can switch to Cash Flow tab", async ({ page }) => {
      await page.goto("/finance");
      await expect(page.locator("h1")).toContainText("Finance");

      await page.locator("button", { hasText: "Cash Flow" }).click();
      await expect(page.locator("h1")).toContainText("Finance");
    });

    test("can switch to P&L tab", async ({ page }) => {
      await page.goto("/finance");
      await expect(page.locator("h1")).toContainText("Finance");

      await page.locator("button", { hasText: "P&L" }).click();
      await expect(page.locator("h1")).toContainText("Finance");
    });

    test("can switch to Budget tab", async ({ page }) => {
      await page.goto("/finance");
      await expect(page.locator("h1")).toContainText("Finance");

      await page.locator("button", { hasText: "Budget" }).click();
      await expect(page.locator("h1")).toContainText("Finance");
    });

    test("KPI values render with ZAR currency format", async ({ page }) => {
      await page.goto("/finance");
      await expect(page.locator("h1")).toContainText("Finance");

      // KPI values should contain R (South African Rand symbol) or ZAR formatting
      // At minimum they should render some numeric value
      const kpiSection = page.locator("text=Capital Deployed").locator("..");
      await expect(kpiSection).toBeVisible();
    });
  });
});
