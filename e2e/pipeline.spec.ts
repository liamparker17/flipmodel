import { test, expect } from "@playwright/test";

test.describe("Pipeline Page", () => {
  test("unauthenticated user is redirected to login", async ({ page }) => {
    await page.goto("/pipeline");
    await expect(page).toHaveURL(/login/);
  });

  test("login page renders after redirect from pipeline", async ({ page }) => {
    await page.goto("/pipeline");
    await expect(page).toHaveURL(/login/);
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  // The tests below require an authenticated session.
  // To run them, configure a global setup that logs in and saves storageState.
  // See: https://playwright.dev/docs/auth
  test.describe("with auth @authenticated", () => {
    test.skip(true, "Requires authenticated session - configure storageState in global setup");

    test("page renders with Pipeline heading", async ({ page }) => {
      await page.goto("/pipeline");
      await expect(page.locator("h1")).toContainText("Pipeline");
    });

    test("shows property count subtitle", async ({ page }) => {
      await page.goto("/pipeline");
      await expect(page.locator("h1")).toContainText("Pipeline");
      await expect(page.locator("text=/propert(y|ies)/")).toBeVisible({ timeout: 10000 });
    });

    test("kanban columns render with stage labels", async ({ page }) => {
      await page.goto("/pipeline");
      await expect(page.locator("h1")).toContainText("Pipeline");

      // Pipeline should show stage columns or empty state
      const emptyState = page.locator("text=No properties in your pipeline yet");
      const stageColumn = page.locator("text=Prospecting")
        .or(page.locator("text=Due Diligence"))
        .or(page.locator("text=Negotiation"));

      await expect(emptyState.or(stageColumn.first())).toBeVisible({ timeout: 10000 });
    });

    test("New Property button is visible", async ({ page }) => {
      await page.goto("/pipeline");
      await expect(page.locator("h1")).toContainText("Pipeline");
      await expect(page.locator("button", { hasText: "New Property" })).toBeVisible();
    });

    test("clicking New Property navigates to deal detail", async ({ page }) => {
      await page.goto("/pipeline");
      await expect(page.locator("h1")).toContainText("Pipeline");

      await page.locator("button", { hasText: "New Property" }).click();

      // Should navigate to /pipeline/[id]
      await expect(page).toHaveURL(/\/pipeline\/[a-zA-Z0-9-]+/, { timeout: 10000 });
    });

    test("search input is present and functional", async ({ page }) => {
      await page.goto("/pipeline");
      await expect(page.locator("h1")).toContainText("Pipeline");

      const searchInput = page.locator("input[placeholder*='Search']");
      await expect(searchInput).toBeVisible();
      await searchInput.fill("nonexistent-xyz");
      await page.waitForTimeout(500);
    });

    test("priority filter dropdown is present", async ({ page }) => {
      await page.goto("/pipeline");
      await expect(page.locator("h1")).toContainText("Pipeline");
      await expect(page.locator("select", { hasText: "All Priorities" })).toBeVisible();
    });

    test("sort dropdown is present", async ({ page }) => {
      await page.goto("/pipeline");
      await expect(page.locator("h1")).toContainText("Pipeline");
      await expect(page.locator("select", { hasText: "Recently Updated" })).toBeVisible();
    });

    test("hide sold checkbox is present", async ({ page }) => {
      await page.goto("/pipeline");
      await expect(page.locator("h1")).toContainText("Pipeline");
      await expect(page.locator("text=Hide Sold")).toBeVisible();
    });

    test("board/list view toggle is present on desktop", async ({ page }) => {
      await page.goto("/pipeline");
      await expect(page.locator("h1")).toContainText("Pipeline");

      await expect(page.locator("button", { hasText: "Board" })).toBeVisible();
      await expect(page.locator("button", { hasText: "List" })).toBeVisible();
    });

    test("can switch to list view", async ({ page }) => {
      await page.goto("/pipeline");
      await expect(page.locator("h1")).toContainText("Pipeline");

      await page.locator("button", { hasText: "List" }).click();

      // List view should show a table
      const table = page.locator("table");
      const emptyState = page.locator("text=No properties in your pipeline yet");
      await expect(table.or(emptyState)).toBeVisible({ timeout: 5000 });
    });
  });
});
