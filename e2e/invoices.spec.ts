import { test, expect } from "@playwright/test";

test.describe("Invoices Page", () => {
  test("unauthenticated user is redirected to login", async ({ page }) => {
    await page.goto("/invoices");
    await expect(page).toHaveURL(/login/);
  });

  test("login page shows callbackUrl for invoices", async ({ page }) => {
    await page.goto("/invoices");
    await expect(page).toHaveURL(/login/);
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  // The tests below require an authenticated session.
  // To run them, configure a global setup that logs in and saves storageState.
  // See: https://playwright.dev/docs/auth
  test.describe("with auth @authenticated", () => {
    test.skip(true, "Requires authenticated session - configure storageState in global setup");

    test("page renders with Invoices heading", async ({ page }) => {
      await page.goto("/invoices");
      await expect(page.locator("h1")).toContainText("Invoices");
    });

    test("shows empty state or invoice table", async ({ page }) => {
      await page.goto("/invoices");
      await expect(page.locator("h1")).toContainText("Invoices");

      const emptyState = page.locator("text=No invoices yet");
      const invoiceTable = page.locator("table");
      await expect(emptyState.or(invoiceTable)).toBeVisible();
    });

    test("New Invoice button is visible", async ({ page }) => {
      await page.goto("/invoices");
      await expect(page.locator("button", { hasText: "New Invoice" })).toBeVisible();
    });

    test("clicking New Invoice opens the form", async ({ page }) => {
      await page.goto("/invoices");
      await page.locator("button", { hasText: "New Invoice" }).click();

      await expect(page.locator("text=Line Items")).toBeVisible();
      await expect(page.locator("text=Invoice Number")).toBeVisible();
      await expect(page.locator("input[placeholder='Description']")).toBeVisible();
    });

    test("can fill in line items and create an invoice", async ({ page }) => {
      await page.goto("/invoices");
      await page.locator("button", { hasText: "New Invoice" }).click();

      // Fill invoice number
      await page.locator("input[placeholder='Auto-generated if empty']").fill("INV-E2E-001");

      // Fill first line item
      await page.locator("input[placeholder='Description']").first().fill("Test service");
      await page.locator("input[placeholder='Qty']").first().fill("2");
      await page.locator("input[placeholder='Unit price']").first().fill("500");

      // Add another line item
      await page.locator("button", { hasText: "Add line" }).click();
      await page.locator("input[placeholder='Description']").nth(1).fill("Additional work");

      // Fill notes
      await page.locator("input[placeholder='Optional notes']").fill("E2E test invoice");

      // Create
      await page.locator("button", { hasText: "Create Invoice" }).click();

      // Form should close
      await expect(page.locator("text=Line Items")).not.toBeVisible({ timeout: 5000 });
    });

    test("cancel button closes the invoice form", async ({ page }) => {
      await page.goto("/invoices");
      await page.locator("button", { hasText: "New Invoice" }).click();
      await expect(page.locator("text=Line Items")).toBeVisible();

      await page.locator("button", { hasText: "Cancel" }).click();
      await expect(page.locator("text=Line Items")).not.toBeVisible();
    });

    test("invoice appears in list after creation", async ({ page }) => {
      await page.goto("/invoices");
      await page.locator("button", { hasText: "New Invoice" }).click();

      await page.locator("input[placeholder='Auto-generated if empty']").fill("INV-E2E-002");
      await page.locator("input[placeholder='Description']").first().fill("Smoke test item");
      await page.locator("input[placeholder='Qty']").first().fill("1");
      await page.locator("input[placeholder='Unit price']").first().fill("1000");

      await page.locator("button", { hasText: "Create Invoice" }).click();
      await expect(page.locator("text=Line Items")).not.toBeVisible({ timeout: 5000 });

      // Verify the invoice shows up in the table
      await expect(page.locator("text=INV-E2E-002")).toBeVisible({ timeout: 5000 });
    });
  });
});
