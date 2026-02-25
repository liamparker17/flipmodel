import { describe, it, expect } from "vitest";
import { createVendorBillSchema, createBillPaymentSchema } from "../payables";

describe("createVendorBillSchema", () => {
  it("accepts valid vendor bill", () => {
    const result = createVendorBillSchema.safeParse({
      billNumber: "BILL-001",
      subtotal: 1000,
      tax: 150,
      total: 1150,
      lines: [
        { description: "Materials", quantity: 10, unitPrice: 100, amount: 1000 },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing bill number", () => {
    const result = createVendorBillSchema.safeParse({
      subtotal: 1000, tax: 0, total: 1000,
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative amounts", () => {
    const result = createVendorBillSchema.safeParse({
      billNumber: "BILL-001",
      subtotal: -100, tax: 0, total: -100,
    });
    expect(result.success).toBe(false);
  });
});

describe("createBillPaymentSchema", () => {
  it("accepts valid payment", () => {
    const result = createBillPaymentSchema.safeParse({
      amount: 500,
      paymentDate: "2026-01-15",
    });
    expect(result.success).toBe(true);
  });

  it("rejects zero amount", () => {
    const result = createBillPaymentSchema.safeParse({
      amount: 0,
      paymentDate: "2026-01-15",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing payment date", () => {
    const result = createBillPaymentSchema.safeParse({
      amount: 500,
    });
    expect(result.success).toBe(false);
  });
});
