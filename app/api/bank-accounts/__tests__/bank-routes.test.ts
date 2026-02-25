import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createBankAccountSchema,
  updateBankAccountSchema,
  createBankTransactionSchema,
  reconcileTransactionSchema,
} from "@/lib/validations/bank";

// ---------------------------------------------------------------------------
// Mock setup
// ---------------------------------------------------------------------------

const mockPrisma = {
  bankAccount: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  bankTransaction: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  orgMember: { findFirst: vi.fn() },
  $transaction: vi.fn(),
};

vi.mock("@/lib/db", () => ({ default: mockPrisma }));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn().mockResolvedValue({ user: { id: "user-1" } }),
}));

vi.mock("@/lib/audit", () => ({
  writeAuditLog: vi.fn().mockResolvedValue(undefined),
  diffChanges: vi.fn().mockReturnValue({}),
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("@/lib/permissions", () => ({
  hasPermission: vi.fn().mockReturnValue(true),
  canAccessModule: vi.fn().mockReturnValue(true),
}));

const ORG_MEMBER = {
  id: "member-1",
  orgId: "org-1",
  userId: "user-1",
  role: "admin",
  departmentId: null,
  title: null,
  moduleOverrides: null,
  permissionOverrides: null,
  isActive: true,
  joinedAt: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.orgMember.findFirst.mockResolvedValue(ORG_MEMBER);
});

function makeRequest(body?: unknown, url = "http://localhost/api/bank-accounts") {
  return new Request(url, {
    method: body ? "POST" : "GET",
    headers: { "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  }) as unknown as import("next/server").NextRequest;
}

// ===========================================================================
// 1 - createBankAccountSchema validation
// ===========================================================================

describe("createBankAccountSchema", () => {
  const validAccount = {
    name: "Business Cheque",
    bankName: "FNB",
    accountNumber: "62345678901",
  };

  it("accepts a valid bank account with required fields only", () => {
    expect(createBankAccountSchema.safeParse(validAccount).success).toBe(true);
  });

  it("rejects missing name", () => {
    const { name: _, ...rest } = validAccount;
    expect(createBankAccountSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects empty name", () => {
    expect(createBankAccountSchema.safeParse({ ...validAccount, name: "" }).success).toBe(false);
  });

  it("rejects missing bankName", () => {
    const { bankName: _, ...rest } = validAccount;
    expect(createBankAccountSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects empty bankName", () => {
    expect(
      createBankAccountSchema.safeParse({ ...validAccount, bankName: "" }).success
    ).toBe(false);
  });

  it("rejects missing accountNumber", () => {
    const { accountNumber: _, ...rest } = validAccount;
    expect(createBankAccountSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects empty accountNumber", () => {
    expect(
      createBankAccountSchema.safeParse({ ...validAccount, accountNumber: "" }).success
    ).toBe(false);
  });

  it("accepts all optional fields", () => {
    const result = createBankAccountSchema.safeParse({
      ...validAccount,
      branchCode: "250655",
      accountType: "savings",
      currency: "ZAR",
      currentBalance: 10000,
      accountCode: "1100",
    });
    expect(result.success).toBe(true);
  });
});

// ===========================================================================
// 2 - updateBankAccountSchema (partial of create)
// ===========================================================================

describe("updateBankAccountSchema", () => {
  it("accepts partial update with only name", () => {
    expect(updateBankAccountSchema.safeParse({ name: "Updated Name" }).success).toBe(true);
  });

  it("accepts empty object", () => {
    expect(updateBankAccountSchema.safeParse({}).success).toBe(true);
  });

  it("rejects empty string for name when provided", () => {
    expect(updateBankAccountSchema.safeParse({ name: "" }).success).toBe(false);
  });
});

// ===========================================================================
// 3 - createBankTransactionSchema validation
// ===========================================================================

describe("createBankTransactionSchema", () => {
  const validTx = {
    bankAccountId: "acc-1",
    date: "2026-02-15",
    description: "Client payment received",
    amount: 5000,
  };

  it("accepts a valid transaction", () => {
    expect(createBankTransactionSchema.safeParse(validTx).success).toBe(true);
  });

  it("accepts negative amounts (withdrawals)", () => {
    expect(
      createBankTransactionSchema.safeParse({ ...validTx, amount: -2500 }).success
    ).toBe(true);
  });

  it("accepts zero amount", () => {
    expect(
      createBankTransactionSchema.safeParse({ ...validTx, amount: 0 }).success
    ).toBe(true);
  });

  it("rejects missing bankAccountId", () => {
    const { bankAccountId: _, ...rest } = validTx;
    expect(createBankTransactionSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects empty bankAccountId", () => {
    expect(
      createBankTransactionSchema.safeParse({ ...validTx, bankAccountId: "" }).success
    ).toBe(false);
  });

  it("rejects missing date", () => {
    const { date: _, ...rest } = validTx;
    expect(createBankTransactionSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects missing description", () => {
    const { description: _, ...rest } = validTx;
    expect(createBankTransactionSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects empty description", () => {
    expect(
      createBankTransactionSchema.safeParse({ ...validTx, description: "" }).success
    ).toBe(false);
  });

  it("accepts optional fields", () => {
    const result = createBankTransactionSchema.safeParse({
      ...validTx,
      reference: "REF-001",
      type: "deposit",
      category: "revenue",
    });
    expect(result.success).toBe(true);
  });
});

// ===========================================================================
// 4 - reconcileTransactionSchema validation
// ===========================================================================

describe("reconcileTransactionSchema", () => {
  it("accepts valid reconciliation data", () => {
    expect(
      reconcileTransactionSchema.safeParse({
        matchedEntityType: "VendorBill",
        matchedEntityId: "bill-123",
      }).success
    ).toBe(true);
  });

  it("rejects missing matchedEntityType", () => {
    expect(
      reconcileTransactionSchema.safeParse({ matchedEntityId: "bill-123" }).success
    ).toBe(false);
  });

  it("rejects empty matchedEntityType", () => {
    expect(
      reconcileTransactionSchema.safeParse({
        matchedEntityType: "",
        matchedEntityId: "bill-123",
      }).success
    ).toBe(false);
  });

  it("rejects missing matchedEntityId", () => {
    expect(
      reconcileTransactionSchema.safeParse({ matchedEntityType: "Invoice" }).success
    ).toBe(false);
  });

  it("rejects empty matchedEntityId", () => {
    expect(
      reconcileTransactionSchema.safeParse({
        matchedEntityType: "Invoice",
        matchedEntityId: "",
      }).success
    ).toBe(false);
  });
});

// ===========================================================================
// 5 - Route handler: create bank account
// ===========================================================================

describe("POST /api/bank-accounts - create bank account", () => {
  it("creates account with defaults and returns 201", async () => {
    const { POST } = await import("@/api/bank-accounts/route");

    const body = {
      name: "Business Cheque",
      bankName: "FNB",
      accountNumber: "62345678901",
    };
    const created = {
      id: "acc-new",
      ...body,
      accountType: "cheque",
      currency: "ZAR",
      currentBalance: 0,
    };
    mockPrisma.bankAccount.create.mockResolvedValue(created);

    const res = await POST(makeRequest(body));
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.accountType).toBe("cheque");
    expect(json.currency).toBe("ZAR");
    expect(json.currentBalance).toBe(0);
  });
});

// ===========================================================================
// 6 - Route handler: create bank transaction
// ===========================================================================

describe("POST /api/bank-accounts/[accountId]/transactions", () => {
  it("creates transaction when account exists", async () => {
    const { POST } = await import(
      "@/api/bank-accounts/[accountId]/transactions/route"
    );

    mockPrisma.bankAccount.findFirst.mockResolvedValue({
      id: "acc-1",
      orgId: "org-1",
    });

    const tx = {
      id: "tx-1",
      bankAccountId: "acc-1",
      date: new Date("2026-02-15"),
      description: "Deposit",
      amount: 5000,
      type: "other",
    };
    mockPrisma.bankTransaction.create.mockResolvedValue(tx);

    const req = makeRequest(
      {
        bankAccountId: "acc-1",
        date: "2026-02-15",
        description: "Deposit",
        amount: 5000,
      },
      "http://localhost/api/bank-accounts/acc-1/transactions"
    );
    const params = { params: Promise.resolve({ accountId: "acc-1" }) };
    const res = await POST(req, params);

    expect(res.status).toBe(201);
  });

  it("returns 404 when bank account does not exist", async () => {
    const { POST } = await import(
      "@/api/bank-accounts/[accountId]/transactions/route"
    );

    mockPrisma.bankAccount.findFirst.mockResolvedValue(null);

    const req = makeRequest(
      {
        bankAccountId: "acc-999",
        date: "2026-02-15",
        description: "Deposit",
        amount: 5000,
      },
      "http://localhost/api/bank-accounts/acc-999/transactions"
    );
    const params = { params: Promise.resolve({ accountId: "acc-999" }) };
    const res = await POST(req, params);

    expect(res.status).toBe(404);
  });
});

// ===========================================================================
// 7 - Route handler: reconcile transaction
// ===========================================================================

describe("POST /api/bank-accounts/[accountId]/transactions/[transactionId]/reconcile", () => {
  it("marks transaction as reconciled", async () => {
    const { POST } = await import(
      "@/api/bank-accounts/[accountId]/transactions/[transactionId]/reconcile/route"
    );

    mockPrisma.bankTransaction.findFirst.mockResolvedValue({
      id: "tx-1",
      bankAccountId: "acc-1",
      orgId: "org-1",
      isReconciled: false,
    });

    const updated = {
      id: "tx-1",
      isReconciled: true,
      reconciledAt: new Date(),
      matchedEntityType: "VendorBill",
      matchedEntityId: "bill-1",
    };
    mockPrisma.bankTransaction.update.mockResolvedValue(updated);

    const req = makeRequest(
      { matchedEntityType: "VendorBill", matchedEntityId: "bill-1" },
      "http://localhost/api/bank-accounts/acc-1/transactions/tx-1/reconcile"
    );
    const params = {
      params: Promise.resolve({ accountId: "acc-1", transactionId: "tx-1" }),
    };
    const res = await POST(req, params);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.isReconciled).toBe(true);
    expect(json.matchedEntityType).toBe("VendorBill");
  });

  it("returns 404 when transaction not found", async () => {
    const { POST } = await import(
      "@/api/bank-accounts/[accountId]/transactions/[transactionId]/reconcile/route"
    );

    mockPrisma.bankTransaction.findFirst.mockResolvedValue(null);

    const req = makeRequest(
      { matchedEntityType: "VendorBill", matchedEntityId: "bill-1" },
      "http://localhost/api/bank-accounts/acc-1/transactions/tx-999/reconcile"
    );
    const params = {
      params: Promise.resolve({ accountId: "acc-1", transactionId: "tx-999" }),
    };
    const res = await POST(req, params);

    expect(res.status).toBe(404);
  });
});

// ===========================================================================
// 8 - Delete bank account with transactions
// ===========================================================================

describe("DELETE /api/bank-accounts/[accountId]", () => {
  it("rejects deletion when account has transactions", async () => {
    const { DELETE } = await import("@/api/bank-accounts/[accountId]/route");

    mockPrisma.bankAccount.findFirst.mockResolvedValue({
      id: "acc-1",
      orgId: "org-1",
      name: "Business",
    });
    mockPrisma.bankTransaction.count.mockResolvedValue(5);

    const req = new Request("http://localhost/api/bank-accounts/acc-1", {
      method: "DELETE",
    }) as unknown as import("next/server").NextRequest;

    const params = { params: Promise.resolve({ accountId: "acc-1" }) };
    const res = await DELETE(req, params);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("existing transactions");
  });

  it("allows deletion when account has no transactions", async () => {
    const { DELETE } = await import("@/api/bank-accounts/[accountId]/route");

    mockPrisma.bankAccount.findFirst.mockResolvedValue({
      id: "acc-1",
      orgId: "org-1",
      name: "Business",
    });
    mockPrisma.bankTransaction.count.mockResolvedValue(0);
    mockPrisma.bankAccount.delete.mockResolvedValue({});

    const req = new Request("http://localhost/api/bank-accounts/acc-1", {
      method: "DELETE",
    }) as unknown as import("next/server").NextRequest;

    const params = { params: Promise.resolve({ accountId: "acc-1" }) };
    const res = await DELETE(req, params);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.deleted).toBe(true);
  });
});
