import { describe, it, expect } from "vitest";
import { createBankAccountSchema, createBankTransactionSchema, reconcileTransactionSchema } from "../bank";

describe("createBankAccountSchema", () => {
  it("accepts valid bank account", () => {
    const result = createBankAccountSchema.safeParse({
      name: "FNB Business",
      bankName: "First National Bank",
      accountNumber: "62012345678",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing required fields", () => {
    expect(createBankAccountSchema.safeParse({ name: "Test" }).success).toBe(false);
    expect(createBankAccountSchema.safeParse({ bankName: "Test" }).success).toBe(false);
  });
});

describe("createBankTransactionSchema", () => {
  it("accepts valid transaction", () => {
    const result = createBankTransactionSchema.safeParse({
      bankAccountId: "acc-1",
      date: "2026-01-15",
      description: "Payment received",
      amount: 5000,
    });
    expect(result.success).toBe(true);
  });

  it("accepts negative amounts (withdrawals)", () => {
    const result = createBankTransactionSchema.safeParse({
      bankAccountId: "acc-1",
      date: "2026-01-15",
      description: "Supplier payment",
      amount: -3000,
    });
    expect(result.success).toBe(true);
  });
});

describe("reconcileTransactionSchema", () => {
  it("accepts valid reconciliation", () => {
    const result = reconcileTransactionSchema.safeParse({
      matchedEntityType: "expense",
      matchedEntityId: "exp-123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing fields", () => {
    expect(reconcileTransactionSchema.safeParse({}).success).toBe(false);
  });
});
