import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Mock setup
// ---------------------------------------------------------------------------

const mockPrisma = {
  invoice: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
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

function makeRequest(body?: unknown, url = "http://localhost/api/invoices") {
  return new Request(url, {
    method: body ? "POST" : "GET",
    headers: { "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  }) as unknown as import("next/server").NextRequest;
}

// Inline schema matching the route file (since it is not exported from a validations file)
const createInvoiceSchema = z.object({
  dealId: z.string().optional(),
  contactId: z.string().optional(),
  invoiceNumber: z.string().min(1),
  status: z.string().optional(),
  issueDate: z.string().optional(),
  dueDate: z.string().optional(),
  subtotal: z.number().optional(),
  tax: z.number().optional(),
  total: z.number().optional(),
  notes: z.string().optional(),
  lineItems: z.array(z.object({
    description: z.string().min(1).max(500),
    quantity: z.number().positive(),
    unitPrice: z.number().min(0),
    amount: z.number().min(0),
  })).optional(),
});

const updateInvoiceSchema = z.object({
  invoiceNumber: z.string().min(1).optional(),
  contactId: z.string().nullable().optional(),
  dealId: z.string().nullable().optional(),
  status: z.string().optional(),
  issueDate: z.string().optional(),
  dueDate: z.string().nullable().optional(),
  subtotal: z.number().min(0).optional(),
  tax: z.number().min(0).optional(),
  total: z.number().min(0).optional(),
  notes: z.string().nullable().optional(),
  lineItems: z.array(z.object({
    description: z.string().min(1).max(500),
    quantity: z.number().positive(),
    unitPrice: z.number().min(0),
    amount: z.number().min(0),
  })).optional(),
});

// ===========================================================================
// 1 - createInvoiceSchema validation
// ===========================================================================

describe("createInvoiceSchema", () => {
  const validInvoice = {
    invoiceNumber: "INV-001",
    subtotal: 10000,
    tax: 1500,
    total: 11500,
    lineItems: [
      { description: "Plumbing work", quantity: 1, unitPrice: 10000, amount: 10000 },
    ],
  };

  it("accepts a valid invoice", () => {
    expect(createInvoiceSchema.safeParse(validInvoice).success).toBe(true);
  });

  it("accepts an invoice without lineItems", () => {
    const { lineItems: _, ...rest } = validInvoice;
    expect(createInvoiceSchema.safeParse(rest).success).toBe(true);
  });

  it("rejects when invoiceNumber is missing", () => {
    const { invoiceNumber: _, ...rest } = validInvoice;
    expect(createInvoiceSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects when invoiceNumber is empty string", () => {
    expect(
      createInvoiceSchema.safeParse({ ...validInvoice, invoiceNumber: "" }).success
    ).toBe(false);
  });

  it("rejects a line item with empty description", () => {
    const result = createInvoiceSchema.safeParse({
      ...validInvoice,
      lineItems: [{ description: "", quantity: 1, unitPrice: 100, amount: 100 }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a line item with non-positive quantity", () => {
    const result = createInvoiceSchema.safeParse({
      ...validInvoice,
      lineItems: [{ description: "Item", quantity: 0, unitPrice: 100, amount: 100 }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a line item with negative unitPrice", () => {
    const result = createInvoiceSchema.safeParse({
      ...validInvoice,
      lineItems: [{ description: "Item", quantity: 1, unitPrice: -50, amount: 100 }],
    });
    expect(result.success).toBe(false);
  });

  it("accepts optional fields (dealId, contactId, dates, notes)", () => {
    const result = createInvoiceSchema.safeParse({
      ...validInvoice,
      dealId: "deal-1",
      contactId: "contact-1",
      issueDate: "2026-02-01",
      dueDate: "2026-03-01",
      notes: "Net 30",
    });
    expect(result.success).toBe(true);
  });
});

// ===========================================================================
// 2 - updateInvoiceSchema validation
// ===========================================================================

describe("updateInvoiceSchema", () => {
  it("accepts an empty object", () => {
    expect(updateInvoiceSchema.safeParse({}).success).toBe(true);
  });

  it("accepts partial update with only status", () => {
    expect(updateInvoiceSchema.safeParse({ status: "sent" }).success).toBe(true);
  });

  it("rejects negative subtotal", () => {
    expect(updateInvoiceSchema.safeParse({ subtotal: -100 }).success).toBe(false);
  });

  it("accepts nullable dueDate", () => {
    expect(updateInvoiceSchema.safeParse({ dueDate: null }).success).toBe(true);
  });

  it("accepts nullable notes", () => {
    expect(updateInvoiceSchema.safeParse({ notes: null }).success).toBe(true);
  });
});

// ===========================================================================
// 3 - Route handler: POST /api/invoices
// ===========================================================================

describe("POST /api/invoices - create invoice", () => {
  it("creates an invoice and returns 201", async () => {
    const { POST } = await import("@/api/invoices/route");
    const body = {
      invoiceNumber: "INV-100",
      subtotal: 5000,
      tax: 750,
      total: 5750,
    };

    const created = { id: "inv-1", status: "draft", ...body };
    mockPrisma.invoice.create.mockResolvedValue(created);

    const res = await POST(makeRequest(body));
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.invoiceNumber).toBe("INV-100");
    expect(json.status).toBe("draft");
  });

  it("returns 400 when invoiceNumber is missing", async () => {
    const { POST } = await import("@/api/invoices/route");

    const res = await POST(makeRequest({ subtotal: 100 }));
    expect(res.status).toBe(400);
  });
});

// ===========================================================================
// 4 - Route handler: DELETE /api/invoices/[invoiceId] - status transitions
// ===========================================================================

describe("DELETE /api/invoices/[invoiceId] - status rules", () => {
  it("rejects deletion of a paid invoice", async () => {
    const { DELETE } = await import("@/api/invoices/[invoiceId]/route");

    mockPrisma.invoice.findFirst.mockResolvedValue({
      id: "inv-1",
      orgId: "org-1",
      status: "paid",
    });

    const req = new Request("http://localhost/api/invoices/inv-1", {
      method: "DELETE",
    }) as unknown as import("next/server").NextRequest;

    const params = { params: Promise.resolve({ invoiceId: "inv-1" }) };
    const res = await DELETE(req, params);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("Cannot delete a paid invoice");
  });

  it("allows deletion of a draft invoice", async () => {
    const { DELETE } = await import("@/api/invoices/[invoiceId]/route");

    mockPrisma.invoice.findFirst.mockResolvedValue({
      id: "inv-1",
      orgId: "org-1",
      status: "draft",
    });
    mockPrisma.invoice.delete.mockResolvedValue({});

    const req = new Request("http://localhost/api/invoices/inv-1", {
      method: "DELETE",
    }) as unknown as import("next/server").NextRequest;

    const params = { params: Promise.resolve({ invoiceId: "inv-1" }) };
    const res = await DELETE(req, params);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.deleted).toBe(true);
  });

  it("returns 404 for non-existent invoice", async () => {
    const { DELETE } = await import("@/api/invoices/[invoiceId]/route");

    mockPrisma.invoice.findFirst.mockResolvedValue(null);

    const req = new Request("http://localhost/api/invoices/inv-999", {
      method: "DELETE",
    }) as unknown as import("next/server").NextRequest;

    const params = { params: Promise.resolve({ invoiceId: "inv-999" }) };
    const res = await DELETE(req, params);

    expect(res.status).toBe(404);
  });
});
