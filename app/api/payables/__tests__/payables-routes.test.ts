import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createVendorBillSchema,
  updateVendorBillSchema,
  createBillPaymentSchema,
} from "@/lib/validations/payables";

// ---------------------------------------------------------------------------
// Mock setup
// ---------------------------------------------------------------------------

const mockPrisma = {
  vendorBill: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    delete: vi.fn(),
  },
  vendorBillLine: { deleteMany: vi.fn() },
  billPayment: { create: vi.fn() },
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
  // Interactive transaction: pass callback through to mockPrisma
  mockPrisma.$transaction.mockImplementation(async (fn: Function, _opts?: unknown) => {
    if (typeof fn === "function") {
      return fn(mockPrisma);
    }
    return fn;
  });
});

function makeRequest(body?: unknown, url = "http://localhost/api/payables") {
  return new Request(url, {
    method: body ? "POST" : "GET",
    headers: { "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  }) as unknown as import("next/server").NextRequest;
}

// ===========================================================================
// 1 - createVendorBillSchema validation
// ===========================================================================

describe("createVendorBillSchema", () => {
  const validBill = {
    billNumber: "BILL-001",
    subtotal: 1000,
    tax: 150,
    total: 1150,
    lines: [{ description: "Materials", quantity: 10, unitPrice: 100, amount: 1000 }],
  };

  it("accepts a valid vendor bill", () => {
    expect(createVendorBillSchema.safeParse(validBill).success).toBe(true);
  });

  it("rejects missing billNumber", () => {
    const { billNumber: _, ...rest } = validBill;
    expect(createVendorBillSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects empty billNumber", () => {
    expect(createVendorBillSchema.safeParse({ ...validBill, billNumber: "" }).success).toBe(false);
  });

  it("rejects negative subtotal", () => {
    expect(createVendorBillSchema.safeParse({ ...validBill, subtotal: -100 }).success).toBe(false);
  });

  it("rejects negative tax", () => {
    expect(createVendorBillSchema.safeParse({ ...validBill, tax: -10 }).success).toBe(false);
  });

  it("rejects negative total", () => {
    expect(createVendorBillSchema.safeParse({ ...validBill, total: -1 }).success).toBe(false);
  });

  it("accepts zero subtotal / tax / total with matching lines", () => {
    const result = createVendorBillSchema.safeParse({
      ...validBill,
      subtotal: 0,
      tax: 0,
      total: 0,
      lines: [{ description: "Credit memo", quantity: 1, unitPrice: 0, amount: 0 }],
    });
    expect(result.success).toBe(true);
  });

  it("rejects a line with empty description", () => {
    const result = createVendorBillSchema.safeParse({
      ...validBill,
      lines: [{ description: "", quantity: 1, unitPrice: 100, amount: 100 }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a line with non-positive quantity", () => {
    const result = createVendorBillSchema.safeParse({
      ...validBill,
      lines: [{ description: "X", quantity: 0, unitPrice: 100, amount: 100 }],
    });
    expect(result.success).toBe(false);
  });

  it("accepts optional fields", () => {
    const result = createVendorBillSchema.safeParse({
      ...validBill,
      contactId: "contact-1",
      dealId: "deal-1",
      issueDate: "2026-02-01",
      dueDate: "2026-03-01",
      currency: "USD",
      notes: "Rush order",
      documentUrl: "https://example.com/doc.pdf",
    });
    expect(result.success).toBe(true);
  });
});

// ===========================================================================
// 2 - createBillPaymentSchema validation
// ===========================================================================

describe("createBillPaymentSchema", () => {
  it("accepts a valid payment", () => {
    expect(
      createBillPaymentSchema.safeParse({ amount: 500, paymentDate: "2026-02-15" }).success
    ).toBe(true);
  });

  it("rejects zero amount", () => {
    expect(
      createBillPaymentSchema.safeParse({ amount: 0, paymentDate: "2026-02-15" }).success
    ).toBe(false);
  });

  it("rejects negative amount", () => {
    expect(
      createBillPaymentSchema.safeParse({ amount: -100, paymentDate: "2026-02-15" }).success
    ).toBe(false);
  });

  it("rejects missing paymentDate", () => {
    expect(createBillPaymentSchema.safeParse({ amount: 500 }).success).toBe(false);
  });

  it("rejects empty paymentDate string", () => {
    expect(
      createBillPaymentSchema.safeParse({ amount: 500, paymentDate: "" }).success
    ).toBe(false);
  });
});

// ===========================================================================
// 3 - Route handler: payment logic (interactive transaction)
// ===========================================================================

describe("POST /api/payables/[billId]/pay - payment logic", () => {
  it("rejects payment that would exceed bill total", async () => {
    const { POST } = await import("@/api/payables/[billId]/pay/route");

    mockPrisma.vendorBill.findFirst.mockResolvedValue({
      id: "bill-1",
      orgId: "org-1",
      status: "approved",
      total: 1000,
      amountPaid: 800,
      issueDate: new Date("2026-01-01"),
    });

    const req = makeRequest(
      { amount: 300, paymentDate: "2026-02-20" },
      "http://localhost/api/payables/bill-1/pay"
    );
    const params = { params: Promise.resolve({ billId: "bill-1" }) };
    const res = await POST(req, params);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("exceed bill total");
  });

  it("accepts payment that equals remaining balance (fully paid)", async () => {
    const { POST } = await import("@/api/payables/[billId]/pay/route");

    const payment = { id: "pay-1", amount: 200 };
    mockPrisma.vendorBill.findFirst.mockResolvedValue({
      id: "bill-1",
      orgId: "org-1",
      status: "approved",
      total: 1000,
      amountPaid: 800,
      issueDate: new Date("2026-01-01"),
    });
    mockPrisma.billPayment.create.mockResolvedValue(payment);
    mockPrisma.vendorBill.updateMany.mockResolvedValue({ count: 1 });

    const req = makeRequest(
      { amount: 200, paymentDate: "2026-02-20" },
      "http://localhost/api/payables/bill-1/pay"
    );
    const params = { params: Promise.resolve({ billId: "bill-1" }) };
    const res = await POST(req, params);

    expect(res.status).toBe(201);
  });

  it("uses conditional atomic update via updateMany", async () => {
    const { POST } = await import("@/api/payables/[billId]/pay/route");

    mockPrisma.vendorBill.findFirst.mockResolvedValue({
      id: "bill-1",
      orgId: "org-1",
      status: "approved",
      total: 1000,
      amountPaid: 0,
      issueDate: new Date("2026-01-01"),
    });
    mockPrisma.billPayment.create.mockResolvedValue({ id: "pay-1" });
    mockPrisma.vendorBill.updateMany.mockResolvedValue({ count: 1 });

    const req = makeRequest(
      { amount: 400, paymentDate: "2026-02-20" },
      "http://localhost/api/payables/bill-1/pay"
    );
    const params = { params: Promise.resolve({ billId: "bill-1" }) };
    await POST(req, params);

    // Verify atomic conditional update was used
    expect(mockPrisma.vendorBill.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "bill-1",
          amountPaid: { lte: 600 }, // total(1000) - payment(400)
        }),
        data: expect.objectContaining({
          amountPaid: { increment: 400 },
        }),
      })
    );
  });

  it("rejects concurrent payment conflict (updateMany count=0)", async () => {
    const { POST } = await import("@/api/payables/[billId]/pay/route");

    mockPrisma.vendorBill.findFirst.mockResolvedValue({
      id: "bill-1",
      orgId: "org-1",
      status: "approved",
      total: 1000,
      amountPaid: 0,
      issueDate: new Date("2026-01-01"),
    });
    mockPrisma.billPayment.create.mockResolvedValue({ id: "pay-1" });
    // Simulate: another payment landed between read and update
    mockPrisma.vendorBill.updateMany.mockResolvedValue({ count: 0 });

    const req = makeRequest(
      { amount: 400, paymentDate: "2026-02-20" },
      "http://localhost/api/payables/bill-1/pay"
    );
    const params = { params: Promise.resolve({ billId: "bill-1" }) };
    const res = await POST(req, params);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("concurrently");
  });

  it("rejects payment date before bill issue date", async () => {
    const { POST } = await import("@/api/payables/[billId]/pay/route");

    mockPrisma.vendorBill.findFirst.mockResolvedValue({
      id: "bill-1",
      orgId: "org-1",
      status: "approved",
      total: 1000,
      amountPaid: 0,
      issueDate: new Date("2026-03-01"),
    });

    const req = makeRequest(
      { amount: 100, paymentDate: "2026-02-15" },
      "http://localhost/api/payables/bill-1/pay"
    );
    const params = { params: Promise.resolve({ billId: "bill-1" }) };
    const res = await POST(req, params);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("before bill issue date");
  });

  it("returns 404 for non-existent bill", async () => {
    const { POST } = await import("@/api/payables/[billId]/pay/route");

    mockPrisma.vendorBill.findFirst.mockResolvedValue(null);

    const req = makeRequest(
      { amount: 100, paymentDate: "2026-02-20" },
      "http://localhost/api/payables/bill-1/pay"
    );
    const params = { params: Promise.resolve({ billId: "bill-1" }) };
    const res = await POST(req, params);

    expect(res.status).toBe(404);
  });

  it("uses serializable isolation level", async () => {
    const { POST } = await import("@/api/payables/[billId]/pay/route");

    mockPrisma.vendorBill.findFirst.mockResolvedValue({
      id: "bill-1",
      orgId: "org-1",
      status: "approved",
      total: 1000,
      amountPaid: 0,
      issueDate: new Date("2026-01-01"),
    });
    mockPrisma.billPayment.create.mockResolvedValue({ id: "pay-1" });
    mockPrisma.vendorBill.updateMany.mockResolvedValue({ count: 1 });

    const req = makeRequest(
      { amount: 100, paymentDate: "2026-02-20" },
      "http://localhost/api/payables/bill-1/pay"
    );
    const params = { params: Promise.resolve({ billId: "bill-1" }) };
    await POST(req, params);

    expect(mockPrisma.$transaction).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({ isolationLevel: "Serializable" })
    );
  });
});

// ===========================================================================
// 4 - Status transitions
// ===========================================================================

describe("Vendor bill status transitions", () => {
  it("creates bills with draft status", async () => {
    const { POST } = await import("@/api/payables/route");

    const body = {
      billNumber: "BILL-100",
      subtotal: 500,
      tax: 75,
      total: 575,
      lines: [{ description: "Service", quantity: 1, unitPrice: 500, amount: 500 }],
    };

    const created = { id: "bill-new", status: "draft", amountPaid: 0, ...body };
    mockPrisma.vendorBill.create.mockResolvedValue(created);

    const res = await POST(makeRequest(body));
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.status).toBe("draft");
    expect(json.amountPaid).toBe(0);
  });

  it("only allows draft or approved bills to be updated", async () => {
    const { PATCH } = await import("@/api/payables/[billId]/route");

    mockPrisma.vendorBill.findFirst.mockResolvedValue({
      id: "bill-1",
      orgId: "org-1",
      status: "paid",
      lines: [],
    });

    const req = new Request("http://localhost/api/payables/bill-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: "Updated" }),
    }) as unknown as import("next/server").NextRequest;

    const params = { params: Promise.resolve({ billId: "bill-1" }) };
    const res = await PATCH(req, params);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("Only draft or approved bills");
  });

  it("only allows draft bills to be deleted", async () => {
    const { DELETE } = await import("@/api/payables/[billId]/route");

    mockPrisma.vendorBill.findFirst.mockResolvedValue({
      id: "bill-1",
      orgId: "org-1",
      status: "partially_paid",
    });

    const req = new Request("http://localhost/api/payables/bill-1", {
      method: "DELETE",
    }) as unknown as import("next/server").NextRequest;

    const params = { params: Promise.resolve({ billId: "bill-1" }) };
    const res = await DELETE(req, params);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("Only draft bills can be deleted");
  });
});
