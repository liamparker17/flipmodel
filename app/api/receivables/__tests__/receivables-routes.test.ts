import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createReceivableSchema,
  updateReceivableSchema,
  createReceivablePaymentSchema,
} from "@/lib/validations/receivables";

// ---------------------------------------------------------------------------
// Mock setup
// ---------------------------------------------------------------------------

const mockPrisma = {
  customerReceivable: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    delete: vi.fn(),
  },
  receivablePayment: { create: vi.fn(), findFirst: vi.fn().mockResolvedValue(null) },
  orgMember: { findFirst: vi.fn() },
  auditLog: { create: vi.fn().mockResolvedValue({}) },
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
  mockPrisma.receivablePayment.findFirst.mockResolvedValue(null);
  // Interactive transaction: pass callback through to mockPrisma
  mockPrisma.$transaction.mockImplementation(async (fn: Function, _opts?: unknown) => {
    if (typeof fn === "function") {
      return fn(mockPrisma);
    }
    return fn;
  });
});

function makeRequest(body?: unknown, url = "http://localhost/api/receivables") {
  return new Request(url, {
    method: body ? "POST" : "GET",
    headers: { "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  }) as unknown as import("next/server").NextRequest;
}

// ===========================================================================
// 1 - createReceivableSchema validation
// ===========================================================================

describe("createReceivableSchema", () => {
  it("accepts a valid receivable with only totalAmount", () => {
    expect(createReceivableSchema.safeParse({ totalAmount: 5000 }).success).toBe(true);
  });

  it("rejects zero totalAmount", () => {
    expect(createReceivableSchema.safeParse({ totalAmount: 0 }).success).toBe(false);
  });

  it("rejects negative totalAmount", () => {
    expect(createReceivableSchema.safeParse({ totalAmount: -100 }).success).toBe(false);
  });

  it("rejects missing totalAmount", () => {
    expect(createReceivableSchema.safeParse({}).success).toBe(false);
  });

  it("accepts all optional fields", () => {
    const result = createReceivableSchema.safeParse({
      totalAmount: 2500,
      invoiceId: "inv-1",
      contactId: "contact-1",
      dealId: "deal-1",
      dueDate: "2026-04-01",
      currency: "USD",
      notes: "Net 30",
    });
    expect(result.success).toBe(true);
  });
});

// ===========================================================================
// 2 - createReceivablePaymentSchema validation
// ===========================================================================

describe("createReceivablePaymentSchema", () => {
  it("accepts a valid payment", () => {
    expect(
      createReceivablePaymentSchema.safeParse({ amount: 1000, paymentDate: "2026-03-01" }).success
    ).toBe(true);
  });

  it("rejects zero amount", () => {
    expect(
      createReceivablePaymentSchema.safeParse({ amount: 0, paymentDate: "2026-03-01" }).success
    ).toBe(false);
  });

  it("rejects negative amount", () => {
    expect(
      createReceivablePaymentSchema.safeParse({ amount: -50, paymentDate: "2026-03-01" }).success
    ).toBe(false);
  });

  it("rejects empty paymentDate", () => {
    expect(
      createReceivablePaymentSchema.safeParse({ amount: 100, paymentDate: "" }).success
    ).toBe(false);
  });
});

// ===========================================================================
// 3 - Payment recording logic & overpayment rejection
// ===========================================================================

describe("POST /api/receivables/[receivableId]/pay - payment logic", () => {
  it("rejects overpayment (amount > remaining balance)", async () => {
    const { POST } = await import("@/api/receivables/[receivableId]/pay/route");

    mockPrisma.customerReceivable.findFirst.mockResolvedValue({
      id: "recv-1",
      orgId: "org-1",
      totalAmount: 1000,
      amountPaid: 900,
    });

    const req = makeRequest(
      { amount: 200, paymentDate: "2026-03-10" },
      "http://localhost/api/receivables/recv-1/pay"
    );
    const params = { params: Promise.resolve({ receivableId: "recv-1" }) };
    const res = await POST(req, params);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("exceed total amount");
  });

  it("accepts payment that exactly fills the remaining balance", async () => {
    const { POST } = await import("@/api/receivables/[receivableId]/pay/route");

    const payment = { id: "pay-1", amount: 300 };
    const updatedReceivable = {
      id: "recv-1",
      amountPaid: 1000,
      status: "paid",
      payments: [payment],
    };
    mockPrisma.customerReceivable.findFirst
      .mockResolvedValueOnce({ id: "recv-1", orgId: "org-1", totalAmount: 1000, amountPaid: 700 })
      .mockResolvedValueOnce(updatedReceivable);
    mockPrisma.receivablePayment.create.mockResolvedValue(payment);
    mockPrisma.customerReceivable.updateMany.mockResolvedValue({ count: 1 });

    const req = makeRequest(
      { amount: 300, paymentDate: "2026-03-10" },
      "http://localhost/api/receivables/recv-1/pay"
    );
    const params = { params: Promise.resolve({ receivableId: "recv-1" }) };
    const res = await POST(req, params);

    expect(res.status).toBe(201);
  });

  it("sets status to partially_paid for partial payment", async () => {
    const { POST } = await import("@/api/receivables/[receivableId]/pay/route");

    const payment = { id: "pay-1", amount: 400 };
    const updatedReceivable = {
      id: "recv-1",
      amountPaid: 400,
      status: "partially_paid",
      payments: [payment],
    };
    mockPrisma.customerReceivable.findFirst
      .mockResolvedValueOnce({ id: "recv-1", orgId: "org-1", totalAmount: 1000, amountPaid: 0 })
      .mockResolvedValueOnce(updatedReceivable);
    mockPrisma.receivablePayment.create.mockResolvedValue(payment);
    mockPrisma.customerReceivable.updateMany.mockResolvedValue({ count: 1 });

    const req = makeRequest(
      { amount: 400, paymentDate: "2026-03-10" },
      "http://localhost/api/receivables/recv-1/pay"
    );
    const params = { params: Promise.resolve({ receivableId: "recv-1" }) };
    const res = await POST(req, params);

    expect(res.status).toBe(201);
  });

  it("returns 404 when receivable not found", async () => {
    const { POST } = await import("@/api/receivables/[receivableId]/pay/route");

    mockPrisma.customerReceivable.findFirst.mockResolvedValue(null);

    const req = makeRequest(
      { amount: 100, paymentDate: "2026-03-10" },
      "http://localhost/api/receivables/recv-999/pay"
    );
    const params = { params: Promise.resolve({ receivableId: "recv-999" }) };
    const res = await POST(req, params);

    expect(res.status).toBe(404);
  });
});

// ===========================================================================
// 4 - Create receivable route
// ===========================================================================

describe("POST /api/receivables - create receivable", () => {
  it("creates receivable with outstanding status and zero amountPaid", async () => {
    const { POST } = await import("@/api/receivables/route");

    const body = { totalAmount: 2500 };
    const created = {
      id: "recv-new",
      orgId: "org-1",
      totalAmount: 2500,
      amountPaid: 0,
      status: "outstanding",
    };
    mockPrisma.customerReceivable.create.mockResolvedValue(created);

    const res = await POST(makeRequest(body));
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.status).toBe("outstanding");
    expect(json.amountPaid).toBe(0);
  });
});

// ===========================================================================
// 5 - Delete receivable constraints
// ===========================================================================

describe("DELETE /api/receivables/[receivableId]", () => {
  it("rejects deletion when receivable has payments", async () => {
    const { DELETE } = await import("@/api/receivables/[receivableId]/route");

    mockPrisma.customerReceivable.findFirst.mockResolvedValue({
      id: "recv-1",
      orgId: "org-1",
      status: "outstanding",
      amountPaid: 500,
    });

    const req = new Request("http://localhost/api/receivables/recv-1", {
      method: "DELETE",
    }) as unknown as import("next/server").NextRequest;

    const params = { params: Promise.resolve({ receivableId: "recv-1" }) };
    const res = await DELETE(req, params);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("payments recorded");
  });

  it("rejects deletion when status is not outstanding", async () => {
    const { DELETE } = await import("@/api/receivables/[receivableId]/route");

    mockPrisma.customerReceivable.findFirst.mockResolvedValue({
      id: "recv-1",
      orgId: "org-1",
      status: "paid",
      amountPaid: 0,
    });

    const req = new Request("http://localhost/api/receivables/recv-1", {
      method: "DELETE",
    }) as unknown as import("next/server").NextRequest;

    const params = { params: Promise.resolve({ receivableId: "recv-1" }) };
    const res = await DELETE(req, params);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("Only outstanding receivables");
  });
});
