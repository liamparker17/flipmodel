import { describe, it, expect } from "vitest";
import { createInventoryItemSchema, createInventoryTransactionSchema } from "../inventory";

describe("createInventoryItemSchema", () => {
  it("accepts valid item", () => {
    const result = createInventoryItemSchema.safeParse({
      sku: "MAT-001",
      name: "Cement 50kg",
    });
    expect(result.success).toBe(true);
  });

  it("accepts item with all optional fields", () => {
    const result = createInventoryItemSchema.safeParse({
      sku: "MAT-002",
      name: "Paint 5L",
      description: "White interior paint",
      category: "materials",
      unit: "each",
      reorderPoint: 10,
      reorderQuantity: 50,
      costPrice: 250,
      location: "Warehouse A",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing sku", () => {
    const result = createInventoryItemSchema.safeParse({ name: "Test" });
    expect(result.success).toBe(false);
  });

  it("rejects missing name", () => {
    const result = createInventoryItemSchema.safeParse({ sku: "SKU-1" });
    expect(result.success).toBe(false);
  });
});

describe("createInventoryTransactionSchema", () => {
  it("accepts valid purchase transaction", () => {
    const result = createInventoryTransactionSchema.safeParse({
      inventoryItemId: "item-1",
      type: "purchase",
      quantity: 100,
      unitCost: 25,
    });
    expect(result.success).toBe(true);
  });

  it("accepts negative quantity for usage", () => {
    const result = createInventoryTransactionSchema.safeParse({
      inventoryItemId: "item-1",
      type: "usage",
      quantity: -10,
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid transaction type", () => {
    const result = createInventoryTransactionSchema.safeParse({
      inventoryItemId: "item-1",
      type: "invalid_type",
      quantity: 10,
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing inventoryItemId", () => {
    const result = createInventoryTransactionSchema.safeParse({
      type: "purchase",
      quantity: 10,
    });
    expect(result.success).toBe(false);
  });
});
