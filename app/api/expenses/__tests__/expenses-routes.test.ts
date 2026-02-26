import { describe, it, expect, vi, beforeEach } from "vitest";
import { createExpenseSchema, updateExpenseSchema } from "@/lib/validations/expense";

// ---------------------------------------------------------------------------
// Mock setup
// ---------------------------------------------------------------------------

const mockPrisma = {
  expense: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    aggregate: vi.fn(),
  },
  deal: { findFirst: vi.fn() },
  orgMember: { findFirst: vi.fn() },
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
  role: "project_manager",
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

function makeRequest(body?: unknown, url = "http://localhost/api/expenses") {
  return new Request(url, {
    method: body ? "POST" : "GET",
    headers: { "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  }) as unknown as import("next/server").NextRequest;
}

// ===========================================================================
// 1 - createExpenseSchema validation
// ===========================================================================

describe("createExpenseSchema", () => {
  const validExpense = {
    dealId: "deal-1",
    category: "materials",
    description: "Cement bags",
    amount: 4500,
    date: "2026-02-15",
  };

  it("accepts a valid expense", () => {
    expect(createExpenseSchema.safeParse(validExpense).success).toBe(true);
  });

  it("rejects when dealId is missing", () => {
    const { dealId: _, ...rest } = validExpense;
    expect(createExpenseSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects when category is missing", () => {
    const { category: _, ...rest } = validExpense;
    expect(createExpenseSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects when category is empty string", () => {
    expect(
      createExpenseSchema.safeParse({ ...validExpense, category: "" }).success
    ).toBe(false);
  });

  it("rejects when description is missing", () => {
    const { description: _, ...rest } = validExpense;
    expect(createExpenseSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects when description is empty string", () => {
    expect(
      createExpenseSchema.safeParse({ ...validExpense, description: "" }).success
    ).toBe(false);
  });

  it("accepts negative amount (credit adjustments)", () => {
    // The schema uses z.number() without min(0) so negatives are allowed
    expect(
      createExpenseSchema.safeParse({ ...validExpense, amount: -200 }).success
    ).toBe(true);
  });

  it("accepts optional fields (vendor, paymentMethod, etc.)", () => {
    const result = createExpenseSchema.safeParse({
      ...validExpense,
      vendor: "BuildIt",
      paymentMethod: "card",
      receiptRef: "REC-001",
      notes: "Bulk order",
      isProjected: true,
      milestoneId: "ms-1",
      contractorId: "contractor-1",
    });
    expect(result.success).toBe(true);
  });
});

// ===========================================================================
// 2 - updateExpenseSchema validation
// ===========================================================================

describe("updateExpenseSchema", () => {
  it("accepts an empty object (all fields optional)", () => {
    expect(updateExpenseSchema.safeParse({}).success).toBe(true);
  });

  it("accepts partial update with amount only", () => {
    expect(updateExpenseSchema.safeParse({ amount: 9999 }).success).toBe(true);
  });

  it("accepts sign-off status fields", () => {
    const result = updateExpenseSchema.safeParse({
      signOffStatus: "approved",
      signOffPmNotes: "Looks good",
    });
    expect(result.success).toBe(true);
  });

  it("accepts nullable fields (receiptRef, notes, milestoneId)", () => {
    const result = updateExpenseSchema.safeParse({
      receiptRef: null,
      notes: null,
      milestoneId: null,
    });
    expect(result.success).toBe(true);
  });
});

// ===========================================================================
// 3 - Route handler: POST /api/expenses (create expense with budget check)
// ===========================================================================

describe("POST /api/expenses - create expense", () => {
  const body = {
    dealId: "deal-1",
    category: "materials",
    description: "Paint",
    amount: 2000,
    date: "2026-02-20",
  };

  it("creates an expense and returns 201", async () => {
    const { POST } = await import("@/api/expenses/route");

    mockPrisma.deal.findFirst.mockResolvedValue({
      id: "deal-1",
      orgId: "org-1",
      data: { quickRenoEstimate: 500000 },
    });
    mockPrisma.expense.aggregate.mockResolvedValue({ _sum: { amount: 10000 } });
    mockPrisma.expense.create.mockResolvedValue({ id: "exp-1", ...body });

    const res = await POST(makeRequest(body));
    expect(res.status).toBe(201);
  });

  it("returns 404 when deal is not found", async () => {
    const { POST } = await import("@/api/expenses/route");

    mockPrisma.deal.findFirst.mockResolvedValue(null);

    const res = await POST(makeRequest(body));
    expect(res.status).toBe(404);
  });

  it("rejects expense that exceeds hard budget limit (120%) without force flag", async () => {
    const { POST } = await import("@/api/expenses/route");

    mockPrisma.deal.findFirst.mockResolvedValue({
      id: "deal-1",
      orgId: "org-1",
      data: { quickRenoEstimate: 100000 },
    });
    // Existing expenses at 110000, adding 15000 = 125000 which is > 120000 (120%)
    mockPrisma.expense.aggregate.mockResolvedValue({ _sum: { amount: 110000 } });

    const res = await POST(makeRequest({ ...body, amount: 15000 }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("Budget exceeded");
  });

  it("allows budget override with force flag", async () => {
    const { POST } = await import("@/api/expenses/route");

    mockPrisma.deal.findFirst.mockResolvedValue({
      id: "deal-1",
      orgId: "org-1",
      data: { quickRenoEstimate: 100000 },
    });
    mockPrisma.expense.aggregate.mockResolvedValue({ _sum: { amount: 110000 } });
    mockPrisma.expense.create.mockResolvedValue({ id: "exp-2", ...body, amount: 15000 });

    const res = await POST(makeRequest({ ...body, amount: 15000, force: true }));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json._budgetWarning).toBeDefined();
  });

  it("returns 400 for invalid body (missing category)", async () => {
    const { POST } = await import("@/api/expenses/route");

    const { category: _, ...noCategory } = body;
    const res = await POST(makeRequest(noCategory));
    expect(res.status).toBe(400);
  });
});

// ===========================================================================
// 4 - Route handler: PATCH /api/expenses/[expenseId] (approve/reject)
// ===========================================================================

describe("PATCH /api/expenses/[expenseId] - approval workflow", () => {
  it("approves an expense when role is project_manager or higher", async () => {
    const { PATCH } = await import("@/api/expenses/[expenseId]/route");

    mockPrisma.expense.findFirst.mockResolvedValue({
      id: "exp-1",
      orgId: "org-1",
      signOffStatus: "pending",
    });
    mockPrisma.expense.update.mockResolvedValue({
      id: "exp-1",
      signOffStatus: "approved",
    });

    const req = new Request("http://localhost/api/expenses/exp-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "approve", notes: "Approved by PM" }),
    }) as unknown as import("next/server").NextRequest;

    const params = { params: Promise.resolve({ expenseId: "exp-1" }) };
    const res = await PATCH(req, params);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.signOffStatus).toBe("approved");
  });

  it("rejects approval when role level is insufficient", async () => {
    const { PATCH } = await import("@/api/expenses/[expenseId]/route");

    // Override member to be field_worker (level 20 < 60 required)
    mockPrisma.orgMember.findFirst.mockResolvedValue({
      ...ORG_MEMBER,
      role: "field_worker",
    });

    mockPrisma.expense.findFirst.mockResolvedValue({
      id: "exp-1",
      orgId: "org-1",
      signOffStatus: "pending",
    });

    const req = new Request("http://localhost/api/expenses/exp-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "approve" }),
    }) as unknown as import("next/server").NextRequest;

    const params = { params: Promise.resolve({ expenseId: "exp-1" }) };
    const res = await PATCH(req, params);

    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toContain("project_manager");
  });

  it("returns 404 for non-existent expense", async () => {
    const { PATCH } = await import("@/api/expenses/[expenseId]/route");

    mockPrisma.expense.findFirst.mockResolvedValue(null);

    const req = new Request("http://localhost/api/expenses/exp-999", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: 5000 }),
    }) as unknown as import("next/server").NextRequest;

    const params = { params: Promise.resolve({ expenseId: "exp-999" }) };
    const res = await PATCH(req, params);

    expect(res.status).toBe(404);
  });
});
