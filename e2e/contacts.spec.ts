import { test, expect } from "@playwright/test";

test.describe("Contacts Page", () => {
  test("unauthenticated user is redirected to login", async ({ page }) => {
    await page.goto("/contacts");
    await expect(page).toHaveURL(/login/);
  });

  test("login page renders after redirect from contacts", async ({ page }) => {
    await page.goto("/contacts");
    await expect(page).toHaveURL(/login/);
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  // The tests below require an authenticated session.
  // To run them, configure a global setup that logs in and saves storageState.
  // See: https://playwright.dev/docs/auth
  test.describe("with auth @authenticated", () => {
    test.skip(true, "Requires authenticated session - configure storageState in global setup");

    test("page renders with Contacts heading", async ({ page }) => {
      await page.goto("/contacts");
      await expect(page.locator("h1")).toContainText("Contacts");
    });

    test("shows contact count subtitle", async ({ page }) => {
      await page.goto("/contacts");
      await expect(page.locator("text=in your network")).toBeVisible();
    });

    test("shows empty state or contact cards", async ({ page }) => {
      await page.goto("/contacts");

      const emptyState = page.locator("text=No contacts yet");
      const contactCards = page.locator("text=View Profile").first();
      await expect(emptyState.or(contactCards)).toBeVisible({ timeout: 10000 });
    });

    test("Add Contact button is visible", async ({ page }) => {
      await page.goto("/contacts");
      await expect(page.locator("button", { hasText: "Add Contact" })).toBeVisible();
    });

    test("clicking Add Contact opens the form", async ({ page }) => {
      await page.goto("/contacts");
      await page.locator("button", { hasText: "Add Contact" }).click();

      await expect(page.locator("h3", { hasText: "New Contact" })).toBeVisible();
      await expect(page.locator("input[placeholder='Full name']")).toBeVisible();
    });

    test("can create a new contact", async ({ page }) => {
      await page.goto("/contacts");
      await page.locator("button", { hasText: "Add Contact" }).click();

      await page.locator("input[placeholder='Full name']").fill("E2E Test Contact");
      await page.locator("input[placeholder='Company name']").fill("Test Corp");
      await page.locator("input[placeholder='+27 ...']").fill("+27 12 345 6789");
      await page.locator("input[placeholder='email@example.com']").fill("e2e@test.com");

      // Select role
      await page.locator("select").first().selectOption("agent");

      // Save
      await page.locator("button", { hasText: "Save Contact" }).click();

      // Form should close
      await expect(page.locator("h3", { hasText: "New Contact" })).not.toBeVisible({ timeout: 5000 });
    });

    test("contact appears in list after creation", async ({ page }) => {
      await page.goto("/contacts");
      await page.locator("button", { hasText: "Add Contact" }).click();

      await page.locator("input[placeholder='Full name']").fill("Smoke Test Person");
      await page.locator("select").first().selectOption("buyer");
      await page.locator("button", { hasText: "Save Contact" }).click();

      await expect(page.locator("h3", { hasText: "New Contact" })).not.toBeVisible({ timeout: 5000 });
      await expect(page.locator("text=Smoke Test Person")).toBeVisible({ timeout: 5000 });
    });

    test("clicking a contact navigates to detail page", async ({ page }) => {
      await page.goto("/contacts");

      const viewProfile = page.locator("text=View Profile").first();
      const count = await viewProfile.count();
      if (count > 0) {
        await viewProfile.click();
        await expect(page).toHaveURL(/\/contacts\/[a-zA-Z0-9-]+/);
      }
    });

    test("search input filters contacts", async ({ page }) => {
      await page.goto("/contacts");

      const searchInput = page.locator("input[placeholder='Search contacts...']");
      await expect(searchInput).toBeVisible();
      await searchInput.fill("nonexistent-xyz");
      await page.waitForTimeout(500);

      // Should show no results message
      await expect(page.locator("text=No contacts match your filters")).toBeVisible();
    });

    test("role filter dropdown is present", async ({ page }) => {
      await page.goto("/contacts");
      await expect(page.locator("select", { hasText: "All Roles" })).toBeVisible();
    });

    test("cancel button closes the add form", async ({ page }) => {
      await page.goto("/contacts");
      await page.locator("button", { hasText: "Add Contact" }).click();
      await expect(page.locator("h3", { hasText: "New Contact" })).toBeVisible();

      await page.locator("button", { hasText: "Cancel" }).last().click();
      await expect(page.locator("h3", { hasText: "New Contact" })).not.toBeVisible();
    });
  });
});
