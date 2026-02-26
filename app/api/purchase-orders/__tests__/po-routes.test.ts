import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createPurchaseOrderSchema,
  updatePurchaseOrderSchema,
  approvePurchaseOrderSchema,
} from "@/lib/validations/purchase-orders";

// ---------------------------------------------------------------------------
// Mock setup
// ---------------------------------------------------------------------------

const mockPrisma = {
  purchaseOrder: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  purchaseOrderLine: { deleteMany: vi.fn() },
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

function makeRequest(body?: unknown, url = "http://localhost/api/purchase-orders") {
  return new Request(url, {
    method: body ? "POST" : "GET",
    headers: { "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  }) as unknown as import("next/server").NextRequest;
}

// ===========================================================================
// 1 - createPurchaseOrderSchema validation
// ===========================================================================

describe("createPurchaseOrderSchema", () => {
  const validPO = {
    subtotal: 5000,
    tax: 750,
    total: 5750,
    lines: [
      { description: "Roof tiles", quantity: 100, unitPrice: 50, amount: 5000 },
    ],
  };

  it("accepts a valid purchase order", () => {
    expect(createPurchaseOrderSchema.safeParse(validPO).success).toBe(true);
  });

  it("accepts empty lines array (schema allows it; route requires at least one)", () => {
    // The Zod schema does not enforce min(1) on lines; business logic in the route
    // handles the case where no lines are provided.
    expect(
      createPurchaseOrderSchema.safeParse({ ...validPO, lines: [] }).success
    ).toBe(true);
  });

  it("rejects when lines are missing entirely", () => {
    const { lines: _, ...rest } = validPO;
    expect(createPurchaseOrderSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects negative subtotal", () => {
    expect(
      createPurchaseOrderSchema.safeParse({ ...validPO, subtotal: -100 }).success
    ).toBe(false);
  });

  it("rejects negative tax", () => {
    expect(
      createPurchaseOrderSchema.safeParse({ ...validPO, tax: -10 }).success
    ).toBe(false);
  });

  it("rejects negative total", () => {
    expect(
      createPurchaseOrderSchema.safeParse({ ...validPO, total: -1 }).success
    ).toBe(false);
  });

  it("rejects a line with empty description", () => {
    const result = createPurchaseOrderSchema.safeParse({
      ...validPO,
      lines: [{ description: "", quantity: 1, unitPrice: 100, amount: 100 }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a line with non-positive quantity", () => {
    const result = createPurchaseOrderSchema.safeParse({
      ...validPO,
      lines: [{ description: "Item", quantity: 0, unitPrice: 100, amount: 100 }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a line with negative unitPrice", () => {
    const result = createPurchaseOrderSchema.safeParse({
      ...validPO,
      lines: [{ description: "Item", quantity: 1, unitPrice: -10, amount: 100 }],
    });
    expect(result.success).toBe(false);
  });

  it("accepts optional fields (contactId, dealId, dates, notes)", () => {
    const result = createPurchaseOrderSchema.safeParse({
      ...validPO,
      contactId: "contact-1",
      dealId: "deal-1",
      orderDate: "2026-02-01",
      expectedDate: "2026-03-01",
      shippingCost: 250,
      currency: "ZAR",
      deliveryAddress: "12 Main Rd",
      notes: "Deliver before 9am",
    });
    expect(result.success).toBe(true);
  });
});

// ===========================================================================
// 2 - updatePurchaseOrderSchema validation
// ===========================================================================

describe("updatePurchaseOrderSchema", () => {
  it("accepts an empty object (all fields optional)", () => {
    expect(updatePurchaseOrderSchema.safeParse({}).success).toBe(true);
  });

  it("accepts partial update with only notes", () => {
    expect(updatePurchaseOrderSchema.safeParse({ notes: "Updated" }).success).toBe(true);
  });

  it("accepts optional lines in update", () => {
    const result = updatePurchaseOrderSchema.safeParse({
      lines: [{ description: "New item", quantity: 5, unitPrice: 200, amount: 1000 }],
    });
    expect(result.success).toBe(true);
  });

  it("rejects negative shippingCost", () => {
    expect(
      updatePurchaseOrderSchema.safeParse({ shippingCost: -50 }).success
    ).toBe(false);
  });
});

// ===========================================================================
// 3 - approvePurchaseOrderSchema validation
// ===========================================================================

describe("approvePurchaseOrderSchema", () => {
  it("accepts an empty object", () => {
    expect(approvePurchaseOrderSchema.safeParse({}).success).toBe(true);
  });
});

// ===========================================================================
// 4 - Route handler: POST /api/purchase-orders (create PO)
// ===========================================================================

describe("POST /api/purchase-orders - create PO", () => {
  it("creates a PO with auto-generated number and returns 201", async () => {
    const { POST } = await import("@/api/purchase-orders/route");
    const body = {
      subtotal: 3000,
      tax: 450,
      total: 3450,
      lines: [{ description: "Bricks", quantity: 500, unitPrice: 6, amount: 3000 }],
    };

    mockPrisma.purchaseOrder.count.mockResolvedValue(4);
    const created = { id: "po-1", poNumber: "PO-000005", status: "draft", ...body, lines: body.lines };
    mockPrisma.purchaseOrder.create.mockResolvedValue(created);

    const res = await POST(makeRequest(body));
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.poNumber).toBe("PO-000005");
    expect(json.status).toBe("draft");
  });

  it("returns 400 when lines are missing", async () => {
    const { POST } = await import("@/api/purchase-orders/route");

    const res = await POST(makeRequest({ subtotal: 100, tax: 0, total: 100 }));
    expect(res.status).toBe(400);
  });
});

// ===========================================================================
// 5 - Route handler: PATCH /api/purchase-orders/[poId] (update PO)
// ===========================================================================

describe("PATCH /api/purchase-orders/[poId] - update PO", () => {
  it("rejects updates to non-draft purchase orders", async () => {
    const { PATCH } = await import("@/api/purchase-orders/[poId]/route");

    mockPrisma.purchaseOrder.findFirst.mockResolvedValue({
      id: "po-1",
      orgId: "org-1",
      status: "approved",
    });

    const req = new Request("http://localhost/api/purchase-orders/po-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: "Updated" }),
    }) as unknown as import("next/server").NextRequest;

    const params = { params: Promise.resolve({ poId: "po-1" }) };
    const res = await PATCH(req, params);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("Only draft purchase orders can be updated");
  });

  it("returns 404 for non-existent PO", async () => {
    const { PATCH } = await import("@/api/purchase-orders/[poId]/route");

    mockPrisma.purchaseOrder.findFirst.mockResolvedValue(null);

    const req = new Request("http://localhost/api/purchase-orders/po-999", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: "Updated" }),
    }) as unknown as import("next/server").NextRequest;

    const params = { params: Promise.resolve({ poId: "po-999" }) };
    const res = await PATCH(req, params);

    expect(res.status).toBe(404);
  });
});

// ===========================================================================
// 6 - Route handler: DELETE /api/purchase-orders/[poId]
// ===========================================================================

describe("DELETE /api/purchase-orders/[poId]", () => {
  it("rejects deletion of non-draft purchase orders", async () => {
    const { DELETE } = await import("@/api/purchase-orders/[poId]/route");

    mockPrisma.purchaseOrder.findFirst.mockResolvedValue({
      id: "po-1",
      orgId: "org-1",
      status: "approved",
      poNumber: "PO-000001",
    });

    const req = new Request("http://localhost/api/purchase-orders/po-1", {
      method: "DELETE",
    }) as unknown as import("next/server").NextRequest;

    const params = { params: Promise.resolve({ poId: "po-1" }) };
    const res = await DELETE(req, params);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("Only draft purchase orders can be deleted");
  });

  it("deletes a draft PO successfully", async () => {
    const { DELETE } = await import("@/api/purchase-orders/[poId]/route");

    mockPrisma.purchaseOrder.findFirst.mockResolvedValue({
      id: "po-1",
      orgId: "org-1",
      status: "draft",
      poNumber: "PO-000001",
    });
    mockPrisma.purchaseOrder.delete.mockResolvedValue({});

    const req = new Request("http://localhost/api/purchase-orders/po-1", {
      method: "DELETE",
    }) as unknown as import("next/server").NextRequest;

    const params = { params: Promise.resolve({ poId: "po-1" }) };
    const res = await DELETE(req, params);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.deleted).toBe(true);
  });
});

// ===========================================================================
// 7 - Route handler: POST /api/purchase-orders/[poId]/approve
// ===========================================================================

describe("POST /api/purchase-orders/[poId]/approve - approval workflow", () => {
  it("approves a draft PO", async () => {
    const { POST } = await import("@/api/purchase-orders/[poId]/approve/route");

    mockPrisma.purchaseOrder.findFirst.mockResolvedValue({
      id: "po-1",
      orgId: "org-1",
      status: "draft",
      poNumber: "PO-000001",
    });
    mockPrisma.purchaseOrder.update.mockResolvedValue({
      id: "po-1",
      status: "approved",
      approvedBy: "user-1",
      lines: [],
    });

    const req = makeRequest({}, "http://localhost/api/purchase-orders/po-1/approve");
    const params = { params: Promise.resolve({ poId: "po-1" }) };
    const res = await POST(req, params);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe("approved");
  });

  it("approves a submitted PO", async () => {
    const { POST } = await import("@/api/purchase-orders/[poId]/approve/route");

    mockPrisma.purchaseOrder.findFirst.mockResolvedValue({
      id: "po-1",
      orgId: "org-1",
      status: "submitted",
      poNumber: "PO-000001",
    });
    mockPrisma.purchaseOrder.update.mockResolvedValue({
      id: "po-1",
      status: "approved",
      lines: [],
    });

    const req = makeRequest({}, "http://localhost/api/purchase-orders/po-1/approve");
    const params = { params: Promise.resolve({ poId: "po-1" }) };
    const res = await POST(req, params);

    expect(res.status).toBe(200);
  });

  it("rejects approval of an already-approved PO", async () => {
    const { POST } = await import("@/api/purchase-orders/[poId]/approve/route");

    mockPrisma.purchaseOrder.findFirst.mockResolvedValue({
      id: "po-1",
      orgId: "org-1",
      status: "approved",
    });

    const req = makeRequest({}, "http://localhost/api/purchase-orders/po-1/approve");
    const params = { params: Promise.resolve({ poId: "po-1" }) };
    const res = await POST(req, params);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("Only draft or submitted");
  });

  it("returns 404 for non-existent PO", async () => {
    const { POST } = await import("@/api/purchase-orders/[poId]/approve/route");

    mockPrisma.purchaseOrder.findFirst.mockResolvedValue(null);

    const req = makeRequest({}, "http://localhost/api/purchase-orders/po-999/approve");
    const params = { params: Promise.resolve({ poId: "po-999" }) };
    const res = await POST(req, params);

    expect(res.status).toBe(404);
  });
});
