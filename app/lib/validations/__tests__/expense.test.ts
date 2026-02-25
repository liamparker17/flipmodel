import { describe, it, expect } from "vitest";
import { createExpenseSchema, updateExpenseSchema } from "../expense";

describe("createExpenseSchema", () => {
  it("accepts valid expense", () => {
    const result = createExpenseSchema.safeParse({
      dealId: "deal-1",
      category: "materials",
      description: "Cement bags",
      amount: 2500,
      date: "2026-01-15",
    });
    expect(result.success).toBe(true);
  });

  it("accepts expense with all optional fields", () => {
    const result = createExpenseSchema.safeParse({
      dealId: "deal-1",
      category: "labour",
      description: "Plumbing work",
      amount: 8000,
      date: "2026-01-20",
      vendor: "Joe Plumbing",
      paymentMethod: "eft",
      receiptRef: "REC-001",
      notes: "First floor bathrooms",
      isProjected: false,
      milestoneId: "ms-1",
      contractorId: "contact-1",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing dealId", () => {
    const result = createExpenseSchema.safeParse({
      category: "materials",
      description: "Test",
      amount: 100,
      date: "2026-01-01",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing category", () => {
    const result = createExpenseSchema.safeParse({
      dealId: "deal-1",
      description: "Test",
      amount: 100,
      date: "2026-01-01",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing description", () => {
    const result = createExpenseSchema.safeParse({
      dealId: "deal-1",
      category: "materials",
      amount: 100,
      date: "2026-01-01",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing amount", () => {
    const result = createExpenseSchema.safeParse({
      dealId: "deal-1",
      category: "materials",
      description: "Test",
      date: "2026-01-01",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing date", () => {
    const result = createExpenseSchema.safeParse({
      dealId: "deal-1",
      category: "materials",
      description: "Test",
      amount: 100,
    });
    expect(result.success).toBe(false);
  });
});

describe("updateExpenseSchema", () => {
  it("accepts partial updates", () => {
    const result = updateExpenseSchema.safeParse({ amount: 3000 });
    expect(result.success).toBe(true);
  });

  it("accepts sign-off status update", () => {
    const result = updateExpenseSchema.safeParse({
      signOffStatus: "approved",
      signOffPmNotes: "Looks good",
    });
    expect(result.success).toBe(true);
  });

  it("accepts nullable fields", () => {
    const result = updateExpenseSchema.safeParse({
      receiptRef: null,
      notes: null,
      milestoneId: null,
    });
    expect(result.success).toBe(true);
  });

  it("accepts empty object", () => {
    const result = updateExpenseSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});
