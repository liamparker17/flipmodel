import { test, expect } from "@playwright/test";

test.describe("API Health", () => {
  test("health endpoint returns 200", async ({ request }) => {
    const response = await request.get("/api/health");
    expect(response.status()).toBe(200);
  });

  test("unauthenticated API request returns 401", async ({ request }) => {
    const response = await request.get("/api/deals");
    expect(response.status()).toBe(401);
  });

  test("search API requires authentication", async ({ request }) => {
    const response = await request.get("/api/search?q=test");
    expect(response.status()).toBe(401);
  });

  test("POST without CSRF token returns 403", async ({ request }) => {
    const response = await request.post("/api/deals", {
      data: { name: "Test Deal" },
      headers: { "Content-Type": "application/json" },
    });
    expect(response.status()).toBe(403);
  });

  test("financial statements require auth", async ({ request }) => {
    const response = await request.get("/api/financial-statements?type=trial_balance");
    expect(response.status()).toBe(401);
  });

  test("GL endpoint requires auth", async ({ request }) => {
    const response = await request.get("/api/gl");
    expect(response.status()).toBe(401);
  });
});
