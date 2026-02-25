import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createInventoryItemSchema,
  updateInventoryItemSchema,
  createInventoryTransactionSchema,
} from "@/lib/validations/inventory";

// ---------------------------------------------------------------------------
// Mock setup
// ---------------------------------------------------------------------------

const mockPrisma = {
  inventoryItem: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  inventoryTransaction: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
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

function makeRequest(body?: unknown, url = "http://localhost/api/inventory") {
  return new Request(url, {
    method: body ? "POST" : "GET",
    headers: { "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  }) as unknown as import("next/server").NextRequest;
}

// ===========================================================================
// 1 - createInventoryItemSchema validation
// ===========================================================================

describe("createInventoryItemSchema", () => {
  const validItem = {
    sku: "MAT-001",
    name: "Cement 50kg",
  };

  it("accepts valid item with required fields only", () => {
    expect(createInventoryItemSchema.safeParse(validItem).success).toBe(true);
  });

  it("rejects missing sku", () => {
    const { sku: _, ...rest } = validItem;
    expect(createInventoryItemSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects empty sku", () => {
    expect(createInventoryItemSchema.safeParse({ ...validItem, sku: "" }).success).toBe(false);
  });

  it("rejects missing name", () => {
    const { name: _, ...rest } = validItem;
    expect(createInventoryItemSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects empty name", () => {
    expect(createInventoryItemSchema.safeParse({ ...validItem, name: "" }).success).toBe(false);
  });

  it("rejects negative reorderPoint", () => {
    expect(
      createInventoryItemSchema.safeParse({ ...validItem, reorderPoint: -1 }).success
    ).toBe(false);
  });

  it("accepts zero reorderPoint", () => {
    expect(
      createInventoryItemSchema.safeParse({ ...validItem, reorderPoint: 0 }).success
    ).toBe(true);
  });

  it("rejects negative reorderQuantity", () => {
    expect(
      createInventoryItemSchema.safeParse({ ...validItem, reorderQuantity: -5 }).success
    ).toBe(false);
  });

  it("rejects negative costPrice", () => {
    expect(
      createInventoryItemSchema.safeParse({ ...validItem, costPrice: -100 }).success
    ).toBe(false);
  });

  it("accepts zero costPrice", () => {
    expect(
      createInventoryItemSchema.safeParse({ ...validItem, costPrice: 0 }).success
    ).toBe(true);
  });

  it("accepts all optional fields", () => {
    const result = createInventoryItemSchema.safeParse({
      ...validItem,
      description: "Portland cement",
      category: "Building Materials",
      unit: "bag",
      reorderPoint: 10,
      reorderQuantity: 50,
      costPrice: 85.5,
      location: "Warehouse A",
      notes: "Bulk item",
    });
    expect(result.success).toBe(true);
  });
});

// ===========================================================================
// 2 - updateInventoryItemSchema validation
// ===========================================================================

describe("updateInventoryItemSchema", () => {
  it("accepts partial update", () => {
    expect(updateInventoryItemSchema.safeParse({ name: "Updated Name" }).success).toBe(true);
  });

  it("accepts empty object", () => {
    expect(updateInventoryItemSchema.safeParse({}).success).toBe(true);
  });

  it("rejects empty string for sku when provided", () => {
    expect(updateInventoryItemSchema.safeParse({ sku: "" }).success).toBe(false);
  });

  it("rejects empty string for name when provided", () => {
    expect(updateInventoryItemSchema.safeParse({ name: "" }).success).toBe(false);
  });
});

// ===========================================================================
// 3 - createInventoryTransactionSchema validation (transaction types)
// ===========================================================================

describe("createInventoryTransactionSchema", () => {
  const validTx = {
    inventoryItemId: "item-1",
    type: "purchase" as const,
    quantity: 50,
  };

  it("accepts valid purchase transaction", () => {
    expect(createInventoryTransactionSchema.safeParse(validTx).success).toBe(true);
  });

  it("accepts all valid transaction types", () => {
    const types = ["purchase", "sale", "adjustment", "transfer", "usage", "return"] as const;
    for (const type of types) {
      const result = createInventoryTransactionSchema.safeParse({ ...validTx, type });
      expect(result.success).toBe(true);
    }
  });

  it("rejects invalid transaction type", () => {
    expect(
      createInventoryTransactionSchema.safeParse({ ...validTx, type: "unknown" }).success
    ).toBe(false);
  });

  it("accepts negative quantity (for outgoing transactions like sale)", () => {
    expect(
      createInventoryTransactionSchema.safeParse({ ...validTx, type: "sale", quantity: -10 })
        .success
    ).toBe(true);
  });

  it("accepts zero quantity (for adjustments)", () => {
    expect(
      createInventoryTransactionSchema.safeParse({
        ...validTx,
        type: "adjustment",
        quantity: 0,
      }).success
    ).toBe(true);
  });

  it("rejects missing inventoryItemId", () => {
    const { inventoryItemId: _, ...rest } = validTx;
    expect(createInventoryTransactionSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects empty inventoryItemId", () => {
    expect(
      createInventoryTransactionSchema.safeParse({ ...validTx, inventoryItemId: "" }).success
    ).toBe(false);
  });

  it("rejects negative unitCost", () => {
    expect(
      createInventoryTransactionSchema.safeParse({ ...validTx, unitCost: -10 }).success
    ).toBe(false);
  });

  it("accepts zero unitCost", () => {
    expect(
      createInventoryTransactionSchema.safeParse({ ...validTx, unitCost: 0 }).success
    ).toBe(true);
  });

  it("accepts optional fields", () => {
    const result = createInventoryTransactionSchema.safeParse({
      ...validTx,
      unitCost: 85.5,
      reference: "PO-001",
      referenceType: "PurchaseOrder",
      referenceId: "po-1",
      dealId: "deal-1",
      notes: "Bulk purchase",
    });
    expect(result.success).toBe(true);
  });
});

// ===========================================================================
// 4 - Route handler: create inventory item
// ===========================================================================

describe("POST /api/inventory - create inventory item", () => {
  it("creates item with zero quantityOnHand and returns 201", async () => {
    const { POST } = await import("@/api/inventory/route");

    const body = { sku: "MAT-001", name: "Cement 50kg" };
    const created = {
      id: "item-new",
      orgId: "org-1",
      ...body,
      quantityOnHand: 0,
      reorderPoint: 0,
      reorderQuantity: 0,
      costPrice: 0,
    };
    mockPrisma.inventoryItem.create.mockResolvedValue(created);

    const res = await POST(makeRequest(body));
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.quantityOnHand).toBe(0);
    expect(json.sku).toBe("MAT-001");
  });
});

// ===========================================================================
// 5 - Route handler: create inventory transaction (quantity tracking)
// ===========================================================================

describe("POST /api/inventory/transactions - inventory transaction", () => {
  it("creates transaction and increments quantityOnHand for purchase", async () => {
    const { POST } = await import("@/api/inventory/transactions/route");

    mockPrisma.inventoryItem.findFirst.mockResolvedValue({
      id: "item-1",
      orgId: "org-1",
      quantityOnHand: 100,
    });

    const txResult = {
      transaction: { id: "tx-1", type: "purchase", quantity: 50, unitCost: 85, totalCost: 4250 },
      item: { id: "item-1", quantityOnHand: 150, lastPurchasePrice: 85 },
    };
    mockPrisma.$transaction.mockImplementation(async (fn: Function) =>
      fn({
        inventoryTransaction: {
          create: vi.fn().mockResolvedValue(txResult.transaction),
        },
        inventoryItem: {
          update: vi.fn().mockResolvedValue(txResult.item),
        },
      })
    );

    const req = makeRequest(
      {
        inventoryItemId: "item-1",
        type: "purchase",
        quantity: 50,
        unitCost: 85,
      },
      "http://localhost/api/inventory/transactions"
    );
    const res = await POST(req);

    expect(res.status).toBe(201);
  });

  it("creates transaction with negative quantity for sale (decrements stock)", async () => {
    const { POST } = await import("@/api/inventory/transactions/route");

    mockPrisma.inventoryItem.findFirst.mockResolvedValue({
      id: "item-1",
      orgId: "org-1",
      quantityOnHand: 100,
    });

    const txResult = {
      transaction: { id: "tx-2", type: "sale", quantity: -20, totalCost: 0 },
      item: { id: "item-1", quantityOnHand: 80 },
    };
    mockPrisma.$transaction.mockImplementation(async (fn: Function) =>
      fn({
        inventoryTransaction: {
          create: vi.fn().mockResolvedValue(txResult.transaction),
        },
        inventoryItem: {
          update: vi.fn().mockResolvedValue(txResult.item),
        },
      })
    );

    const req = makeRequest(
      {
        inventoryItemId: "item-1",
        type: "sale",
        quantity: -20,
      },
      "http://localhost/api/inventory/transactions"
    );
    const res = await POST(req);

    expect(res.status).toBe(201);
  });

  it("returns 404 when inventory item does not exist", async () => {
    const { POST } = await import("@/api/inventory/transactions/route");

    mockPrisma.inventoryItem.findFirst.mockResolvedValue(null);

    const req = makeRequest(
      {
        inventoryItemId: "item-999",
        type: "purchase",
        quantity: 10,
      },
      "http://localhost/api/inventory/transactions"
    );
    const res = await POST(req);

    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toContain("Inventory item not found");
  });
});

// ===========================================================================
// 6 - Delete inventory item constraints
// ===========================================================================

describe("DELETE /api/inventory/[itemId]", () => {
  it("rejects deletion when item has stock on hand", async () => {
    const { DELETE } = await import("@/api/inventory/[itemId]/route");

    mockPrisma.inventoryItem.findFirst.mockResolvedValue({
      id: "item-1",
      orgId: "org-1",
      quantityOnHand: 25,
      sku: "MAT-001",
    });

    const req = new Request("http://localhost/api/inventory/item-1", {
      method: "DELETE",
    }) as unknown as import("next/server").NextRequest;

    const params = { params: Promise.resolve({ itemId: "item-1" }) };
    const res = await DELETE(req, params);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("stock on hand");
  });

  it("allows deletion when quantityOnHand is zero", async () => {
    const { DELETE } = await import("@/api/inventory/[itemId]/route");

    mockPrisma.inventoryItem.findFirst.mockResolvedValue({
      id: "item-1",
      orgId: "org-1",
      quantityOnHand: 0,
      sku: "MAT-001",
    });
    mockPrisma.inventoryItem.delete.mockResolvedValue({});

    const req = new Request("http://localhost/api/inventory/item-1", {
      method: "DELETE",
    }) as unknown as import("next/server").NextRequest;

    const params = { params: Promise.resolve({ itemId: "item-1" }) };
    const res = await DELETE(req, params);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.deleted).toBe(true);
  });

  it("returns 404 when item does not exist", async () => {
    const { DELETE } = await import("@/api/inventory/[itemId]/route");

    mockPrisma.inventoryItem.findFirst.mockResolvedValue(null);

    const req = new Request("http://localhost/api/inventory/item-999", {
      method: "DELETE",
    }) as unknown as import("next/server").NextRequest;

    const params = { params: Promise.resolve({ itemId: "item-999" }) };
    const res = await DELETE(req, params);

    expect(res.status).toBe(404);
  });
});
