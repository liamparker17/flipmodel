import { describe, it, expect } from "vitest";
import { createDealSchema, updateDealSchema } from "../deal";

describe("createDealSchema", () => {
  it("accepts minimal valid deal", () => {
    const result = createDealSchema.safeParse({ name: "Test Deal" });
    expect(result.success).toBe(true);
  });

  it("accepts deal with all fields", () => {
    const result = createDealSchema.safeParse({
      name: "Full Deal",
      address: "123 Main St, Cape Town",
      purchasePrice: 1500000,
      expectedSalePrice: 2500000,
      stage: "lead",
      priority: "high",
      notes: "Potential flip",
      tags: ["cape-town", "residential"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = createDealSchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });

  it("rejects name over 200 characters", () => {
    const result = createDealSchema.safeParse({ name: "x".repeat(201) });
    expect(result.success).toBe(false);
  });

  it("rejects negative purchase price", () => {
    const result = createDealSchema.safeParse({ name: "Test", purchasePrice: -100 });
    expect(result.success).toBe(false);
  });

  it("rejects negative expected sale price", () => {
    const result = createDealSchema.safeParse({ name: "Test", expectedSalePrice: -1 });
    expect(result.success).toBe(false);
  });

  it("accepts zero purchase price", () => {
    const result = createDealSchema.safeParse({ name: "Test", purchasePrice: 0 });
    expect(result.success).toBe(true);
  });
});

describe("updateDealSchema", () => {
  it("accepts partial updates", () => {
    const result = updateDealSchema.safeParse({ stage: "purchased" });
    expect(result.success).toBe(true);
  });

  it("accepts empty object (no changes)", () => {
    const result = updateDealSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts nullable actualSalePrice", () => {
    const result = updateDealSchema.safeParse({ actualSalePrice: null });
    expect(result.success).toBe(true);
  });

  it("accepts date strings", () => {
    const result = updateDealSchema.safeParse({
      purchaseDate: "2026-01-15",
      soldDate: null,
    });
    expect(result.success).toBe(true);
  });

  it("rejects name over 200 characters", () => {
    const result = updateDealSchema.safeParse({ name: "x".repeat(201) });
    expect(result.success).toBe(false);
  });
});
