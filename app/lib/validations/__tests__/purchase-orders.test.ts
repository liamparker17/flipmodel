import { describe, it, expect } from "vitest";
import { createPurchaseOrderSchema } from "../purchase-orders";

describe("createPurchaseOrderSchema", () => {
  it("accepts valid purchase order", () => {
    const result = createPurchaseOrderSchema.safeParse({
      subtotal: 5000,
      tax: 750,
      total: 5750,
      lines: [
        { description: "Cement 50kg bags", quantity: 20, unitPrice: 250, amount: 5000 },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("accepts PO with all optional fields", () => {
    const result = createPurchaseOrderSchema.safeParse({
      contactId: "supplier-1",
      dealId: "deal-1",
      orderDate: "2026-02-01",
      expectedDate: "2026-02-15",
      subtotal: 1000,
      tax: 150,
      total: 1150,
      shippingCost: 200,
      currency: "ZAR",
      deliveryAddress: "123 Main St",
      notes: "Urgent delivery",
      lines: [
        { description: "Paint", quantity: 5, unitPrice: 200, amount: 1000, inventoryItemId: "item-1" },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects negative subtotal", () => {
    const result = createPurchaseOrderSchema.safeParse({
      subtotal: -100, tax: 0, total: -100,
      lines: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects lines with non-positive quantity", () => {
    const result = createPurchaseOrderSchema.safeParse({
      subtotal: 100, tax: 0, total: 100,
      lines: [
        { description: "Item", quantity: 0, unitPrice: 100, amount: 0 },
      ],
    });
    expect(result.success).toBe(false);
  });
});
