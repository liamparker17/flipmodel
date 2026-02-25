import { describe, it, expect } from "vitest";
import { createToolSchema, updateToolSchema, checkoutToolSchema, returnToolSchema } from "../tool";

describe("createToolSchema", () => {
  it("accepts valid tool", () => {
    const result = createToolSchema.safeParse({
      name: "Bosch Drill",
      category: "power_tools",
    });
    expect(result.success).toBe(true);
  });

  it("accepts tool with all fields", () => {
    const result = createToolSchema.safeParse({
      name: "Makita Grinder",
      category: "power_tools",
      brand: "Makita",
      model: "GA5030",
      serialNumber: "SN-12345",
      purchaseDate: "2025-06-01",
      purchaseCost: 2500,
      expectedLifespanMonths: 36,
      replacementCost: 3000,
      status: "available",
      condition: "new",
      notes: "Heavy duty",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = createToolSchema.safeParse({ name: "", category: "power_tools" });
    expect(result.success).toBe(false);
  });

  it("rejects empty category", () => {
    const result = createToolSchema.safeParse({ name: "Drill", category: "" });
    expect(result.success).toBe(false);
  });

  it("rejects negative purchase cost", () => {
    const result = createToolSchema.safeParse({
      name: "Drill",
      category: "power_tools",
      purchaseCost: -100,
    });
    expect(result.success).toBe(false);
  });
});

describe("checkoutToolSchema", () => {
  it("accepts valid checkout", () => {
    const result = checkoutToolSchema.safeParse({
      contractorName: "John Smith",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty contractor name", () => {
    const result = checkoutToolSchema.safeParse({ contractorName: "" });
    expect(result.success).toBe(false);
  });
});

describe("returnToolSchema", () => {
  it("accepts valid return", () => {
    const result = returnToolSchema.safeParse({
      checkoutId: "co-1",
      conditionIn: "good",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing checkoutId", () => {
    const result = returnToolSchema.safeParse({ conditionIn: "good" });
    expect(result.success).toBe(false);
  });
});
