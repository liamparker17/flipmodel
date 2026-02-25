import { describe, it, expect } from "vitest";
import { createReceivableSchema, createReceivablePaymentSchema } from "../receivables";

describe("createReceivableSchema", () => {
  it("accepts valid receivable", () => {
    const result = createReceivableSchema.safeParse({
      totalAmount: 5000,
    });
    expect(result.success).toBe(true);
  });

  it("accepts receivable with all fields", () => {
    const result = createReceivableSchema.safeParse({
      invoiceId: "inv-1",
      contactId: "contact-1",
      dealId: "deal-1",
      totalAmount: 10000,
      dueDate: "2026-03-01",
      currency: "ZAR",
      notes: "Payment for renovations",
    });
    expect(result.success).toBe(true);
  });

  it("rejects zero total amount", () => {
    const result = createReceivableSchema.safeParse({
      totalAmount: 0,
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative total amount", () => {
    const result = createReceivableSchema.safeParse({
      totalAmount: -100,
    });
    expect(result.success).toBe(false);
  });
});

describe("createReceivablePaymentSchema", () => {
  it("accepts valid payment", () => {
    const result = createReceivablePaymentSchema.safeParse({
      amount: 2500,
      paymentDate: "2026-02-15",
    });
    expect(result.success).toBe(true);
  });

  it("rejects negative amount", () => {
    const result = createReceivablePaymentSchema.safeParse({
      amount: -100,
      paymentDate: "2026-02-15",
    });
    expect(result.success).toBe(false);
  });
});
