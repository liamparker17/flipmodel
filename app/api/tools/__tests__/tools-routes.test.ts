import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createToolSchema,
  updateToolSchema,
  checkoutToolSchema,
  returnToolSchema,
} from "@/lib/validations/tool";

// ---------------------------------------------------------------------------
// Mock setup: prisma, auth, permissions
// ---------------------------------------------------------------------------

const mockPrisma = {
  tool: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  toolCheckout: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  toolMaintenance: {
    findMany: vi.fn(),
    create: vi.fn(),
  },
  toolIncident: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
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

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function makeRequest(body?: unknown, url = "http://localhost/api/tools") {
  return new Request(url, {
    method: body ? "POST" : "GET",
    headers: { "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  }) as unknown as import("next/server").NextRequest;
}

function makePatchRequest(body: unknown, url = "http://localhost/api/tools/tool-1") {
  return new Request(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as import("next/server").NextRequest;
}

// ===========================================================================
// 1 - createToolSchema validation
// ===========================================================================

describe("createToolSchema", () => {
  const validTool = { name: "Drill", category: "power_tools" };

  it("accepts a valid tool with required fields only", () => {
    expect(createToolSchema.safeParse(validTool).success).toBe(true);
  });

  it("accepts a tool with all optional fields", () => {
    const result = createToolSchema.safeParse({
      ...validTool,
      brand: "Bosch",
      model: "GSB-13RE",
      serialNumber: "SN-12345",
      purchaseDate: "2025-06-01",
      purchaseCost: 2500,
      expectedLifespanMonths: 36,
      replacementCost: 3000,
      status: "available",
      condition: "new",
      notes: "Bought for site A",
    });
    expect(result.success).toBe(true);
  });

  it("rejects when name is missing", () => {
    expect(createToolSchema.safeParse({ category: "power_tools" }).success).toBe(false);
  });

  it("rejects when name is empty string", () => {
    expect(createToolSchema.safeParse({ name: "", category: "power_tools" }).success).toBe(false);
  });

  it("rejects when category is missing", () => {
    expect(createToolSchema.safeParse({ name: "Drill" }).success).toBe(false);
  });

  it("rejects when category is empty string", () => {
    expect(createToolSchema.safeParse({ name: "Drill", category: "" }).success).toBe(false);
  });

  it("rejects negative purchaseCost", () => {
    const result = createToolSchema.safeParse({ ...validTool, purchaseCost: -100 });
    expect(result.success).toBe(false);
  });

  it("rejects expectedLifespanMonths of 0", () => {
    const result = createToolSchema.safeParse({ ...validTool, expectedLifespanMonths: 0 });
    expect(result.success).toBe(false);
  });

  it("rejects non-integer expectedLifespanMonths", () => {
    const result = createToolSchema.safeParse({ ...validTool, expectedLifespanMonths: 6.5 });
    expect(result.success).toBe(false);
  });
});

// ===========================================================================
// 2 - updateToolSchema validation
// ===========================================================================

describe("updateToolSchema", () => {
  it("accepts partial update with only name", () => {
    expect(updateToolSchema.safeParse({ name: "Updated Drill" }).success).toBe(true);
  });

  it("accepts empty object (all fields optional)", () => {
    expect(updateToolSchema.safeParse({}).success).toBe(true);
  });

  it("accepts nullable fields set to null", () => {
    const result = updateToolSchema.safeParse({
      brand: null,
      model: null,
      serialNumber: null,
      currentHolderName: null,
      currentDealId: null,
    });
    expect(result.success).toBe(true);
  });

  it("rejects negative purchaseCost in update", () => {
    expect(updateToolSchema.safeParse({ purchaseCost: -50 }).success).toBe(false);
  });
});

// ===========================================================================
// 3 - checkoutToolSchema validation
// ===========================================================================

describe("checkoutToolSchema", () => {
  it("accepts valid checkout with required fields", () => {
    expect(checkoutToolSchema.safeParse({ contractorName: "John" }).success).toBe(true);
  });

  it("accepts checkout with all optional fields", () => {
    const result = checkoutToolSchema.safeParse({
      contractorName: "John",
      contractorId: "c-1",
      dealId: "deal-1",
      dealName: "123 Main St",
      propertyAddress: "123 Main St, JHB",
      expectedReturnDate: "2026-04-01",
      notes: "Needs it for 2 weeks",
    });
    expect(result.success).toBe(true);
  });

  it("rejects when contractorName is missing", () => {
    expect(checkoutToolSchema.safeParse({}).success).toBe(false);
  });

  it("rejects when contractorName is empty", () => {
    expect(checkoutToolSchema.safeParse({ contractorName: "" }).success).toBe(false);
  });
});

// ===========================================================================
// 4 - returnToolSchema validation
// ===========================================================================

describe("returnToolSchema", () => {
  it("accepts valid return with required fields", () => {
    expect(returnToolSchema.safeParse({ checkoutId: "co-1", conditionIn: "good" }).success).toBe(true);
  });

  it("rejects when checkoutId is missing", () => {
    expect(returnToolSchema.safeParse({ conditionIn: "good" }).success).toBe(false);
  });

  it("rejects when conditionIn is missing", () => {
    expect(returnToolSchema.safeParse({ checkoutId: "co-1" }).success).toBe(false);
  });

  it("rejects when checkoutId is empty", () => {
    expect(returnToolSchema.safeParse({ checkoutId: "", conditionIn: "good" }).success).toBe(false);
  });

  it("rejects when conditionIn is empty", () => {
    expect(returnToolSchema.safeParse({ checkoutId: "co-1", conditionIn: "" }).success).toBe(false);
  });
});

// ===========================================================================
// 5 - Route handler: POST /api/tools (create tool)
// ===========================================================================

describe("POST /api/tools - create tool", () => {
  it("creates a tool and returns 201", async () => {
    const { POST } = await import("@/api/tools/route");
    const body = { name: "Angle Grinder", category: "power_tools" };

    const created = {
      id: "tool-1",
      orgId: "org-1",
      ...body,
      status: "available",
      condition: "new",
      purchaseCost: 0,
    };
    mockPrisma.tool.create.mockResolvedValue(created);

    const res = await POST(makeRequest(body));
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.name).toBe("Angle Grinder");
    expect(json.status).toBe("available");
  });

  it("returns 400 when name is missing", async () => {
    const { POST } = await import("@/api/tools/route");
    const res = await POST(makeRequest({ category: "hand_tools" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when category is missing", async () => {
    const { POST } = await import("@/api/tools/route");
    const res = await POST(makeRequest({ name: "Hammer" }));
    expect(res.status).toBe(400);
  });
});

// ===========================================================================
// 6 - Route handler: PATCH /api/tools/[toolId] (checkout action)
// ===========================================================================

describe("PATCH /api/tools/[toolId] - checkout action", () => {
  it("checks out a tool successfully", async () => {
    const { PATCH } = await import("@/api/tools/[toolId]/route");

    const existingTool = { id: "tool-1", orgId: "org-1", status: "available", condition: "good" };
    mockPrisma.tool.findFirst.mockResolvedValue(existingTool);
    mockPrisma.toolCheckout.create.mockResolvedValue({ id: "co-1" });
    mockPrisma.tool.update.mockResolvedValue({ ...existingTool, status: "checked_out", currentHolderName: "John" });

    const body = { _action: "checkout", contractorName: "John" };
    const req = makePatchRequest(body, "http://localhost/api/tools/tool-1");
    const params = { params: Promise.resolve({ toolId: "tool-1" }) };
    const res = await PATCH(req, params);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.status).toBe("checked_out");
    expect(json.currentHolderName).toBe("John");
  });

  it("returns 404 when checking out a non-existent tool", async () => {
    const { PATCH } = await import("@/api/tools/[toolId]/route");

    mockPrisma.tool.findFirst.mockResolvedValue(null);

    const body = { _action: "checkout", contractorName: "John" };
    const req = makePatchRequest(body, "http://localhost/api/tools/tool-999");
    const params = { params: Promise.resolve({ toolId: "tool-999" }) };
    const res = await PATCH(req, params);

    expect(res.status).toBe(404);
  });
});

// ===========================================================================
// 7 - Route handler: PATCH /api/tools/[toolId] (return action)
// ===========================================================================

describe("PATCH /api/tools/[toolId] - return action", () => {
  it("returns a tool successfully", async () => {
    const { PATCH } = await import("@/api/tools/[toolId]/route");

    const checkout = { id: "co-1", orgId: "org-1", toolId: "tool-1" };
    mockPrisma.toolCheckout.findFirst.mockResolvedValue(checkout);
    mockPrisma.toolCheckout.update.mockResolvedValue({ ...checkout, returnedAt: new Date() });
    mockPrisma.tool.update.mockResolvedValue({ id: "tool-1", status: "available", condition: "good" });

    const body = { _action: "return", checkoutId: "co-1", conditionIn: "good" };
    const req = makePatchRequest(body, "http://localhost/api/tools/tool-1");
    const params = { params: Promise.resolve({ toolId: "tool-1" }) };
    const res = await PATCH(req, params);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.status).toBe("available");
  });

  it("returns 404 when checkout record not found", async () => {
    const { PATCH } = await import("@/api/tools/[toolId]/route");

    mockPrisma.toolCheckout.findFirst.mockResolvedValue(null);

    const body = { _action: "return", checkoutId: "co-999", conditionIn: "good" };
    const req = makePatchRequest(body, "http://localhost/api/tools/tool-1");
    const params = { params: Promise.resolve({ toolId: "tool-1" }) };
    const res = await PATCH(req, params);

    expect(res.status).toBe(404);
  });
});

// ===========================================================================
// 8 - Route handler: PATCH /api/tools/[toolId] (regular update)
// ===========================================================================

describe("PATCH /api/tools/[toolId] - regular update", () => {
  it("returns 404 for non-existent tool", async () => {
    const { PATCH } = await import("@/api/tools/[toolId]/route");

    mockPrisma.tool.findFirst.mockResolvedValue(null);

    const body = { name: "Updated Name" };
    const req = makePatchRequest(body, "http://localhost/api/tools/tool-999");
    const params = { params: Promise.resolve({ toolId: "tool-999" }) };
    const res = await PATCH(req, params);

    expect(res.status).toBe(404);
  });
});
