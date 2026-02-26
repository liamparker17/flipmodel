import { describe, it, expect, vi, beforeEach } from "vitest";
import { createDealSchema, updateDealSchema } from "@/lib/validations/deal";

// ---------------------------------------------------------------------------
// Mock setup: prisma, auth, audit, permissions
// ---------------------------------------------------------------------------

const mockPrisma = {
  deal: {
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

function makeRequest(body?: unknown, url = "http://localhost/api/deals") {
  return new Request(url, {
    method: body ? "POST" : "GET",
    headers: { "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  }) as unknown as import("next/server").NextRequest;
}

// ===========================================================================
// 1 - createDealSchema validation
// ===========================================================================

describe("createDealSchema", () => {
  const validDeal = {
    name: "Parklands Flip",
    address: "12 Main Rd, Parklands",
    purchasePrice: 1200000,
    expectedSalePrice: 2500000,
    stage: "lead",
    priority: "high",
  };

  it("accepts a valid deal with all optional fields", () => {
    expect(createDealSchema.safeParse(validDeal).success).toBe(true);
  });

  it("accepts a minimal deal with only name", () => {
    expect(createDealSchema.safeParse({ name: "Quick Deal" }).success).toBe(true);
  });

  it("rejects when name is missing", () => {
    const { name: _, ...rest } = validDeal;
    expect(createDealSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects when name is empty string", () => {
    expect(createDealSchema.safeParse({ ...validDeal, name: "" }).success).toBe(false);
  });

  it("rejects when name exceeds 200 characters", () => {
    expect(
      createDealSchema.safeParse({ ...validDeal, name: "x".repeat(201) }).success
    ).toBe(false);
  });

  it("rejects negative purchasePrice", () => {
    expect(
      createDealSchema.safeParse({ ...validDeal, purchasePrice: -100 }).success
    ).toBe(false);
  });

  it("rejects negative expectedSalePrice", () => {
    expect(
      createDealSchema.safeParse({ ...validDeal, expectedSalePrice: -1 }).success
    ).toBe(false);
  });

  it("accepts zero purchasePrice", () => {
    expect(
      createDealSchema.safeParse({ ...validDeal, purchasePrice: 0 }).success
    ).toBe(true);
  });

  it("accepts tags as an array of strings", () => {
    const result = createDealSchema.safeParse({ ...validDeal, tags: ["urgent", "cape-town"] });
    expect(result.success).toBe(true);
  });

  it("rejects tags with non-string elements", () => {
    const result = createDealSchema.safeParse({ ...validDeal, tags: [1, 2, 3] });
    expect(result.success).toBe(false);
  });

  it("rejects address longer than 500 characters", () => {
    expect(
      createDealSchema.safeParse({ ...validDeal, address: "x".repeat(501) }).success
    ).toBe(false);
  });

  it("accepts a deal with the data (advanced mode) field", () => {
    const dealWithData = {
      name: "Advanced Deal",
      data: {
        mode: "quick",
        acq: {
          purchasePrice: 1200000, deposit: 0, bondRate: 12.75, bondTerm: 240,
          cashPurchase: false, transferAttorneyFees: 45000, bondRegistration: 25000, initialRepairs: 0,
        },
        prop: { totalSqm: 180, erfSize: 600, bedrooms: 3, bathrooms: 2, garages: 1, stories: "single" },
        rooms: [], nextRoomId: 0, contractors: [],
        costDb: {}, contingencyPct: 10, pmPct: 8,
        holding: { renovationMonths: 4, ratesAndTaxes: 1800, utilities: 1200, insurance: 950, security: 2500, levies: 0 },
        resale: { expectedPrice: 2800000, areaBenchmarkPsqm: 18000, agentCommission: 5 },
        quickRenoEstimate: 500000,
      },
    };
    expect(createDealSchema.safeParse(dealWithData).success).toBe(true);
  });
});

// ===========================================================================
// 2 - updateDealSchema validation
// ===========================================================================

describe("updateDealSchema", () => {
  it("accepts an empty object (all fields optional)", () => {
    expect(updateDealSchema.safeParse({}).success).toBe(true);
  });

  it("accepts partial update with only name", () => {
    expect(updateDealSchema.safeParse({ name: "Renamed" }).success).toBe(true);
  });

  it("accepts partial update with stage", () => {
    expect(updateDealSchema.safeParse({ stage: "renovating" }).success).toBe(true);
  });

  it("rejects empty name", () => {
    expect(updateDealSchema.safeParse({ name: "" }).success).toBe(false);
  });

  it("accepts nullable actualSalePrice", () => {
    expect(updateDealSchema.safeParse({ actualSalePrice: null }).success).toBe(true);
  });

  it("accepts nullable date fields", () => {
    const result = updateDealSchema.safeParse({
      offerDate: null,
      purchaseDate: null,
      soldDate: null,
    });
    expect(result.success).toBe(true);
  });

  it("rejects negative offerAmount", () => {
    expect(updateDealSchema.safeParse({ offerAmount: -5000 }).success).toBe(false);
  });
});

// ===========================================================================
// 3 - Route handler: POST /api/deals (create deal)
// ===========================================================================

describe("POST /api/deals - create deal", () => {
  it("creates a deal with defaults and returns 201", async () => {
    const { POST } = await import("@/api/deals/route");
    const body = { name: "Test Flip" };

    const created = { id: "deal-1", name: "Test Flip", stage: "lead", priority: "medium" };
    mockPrisma.deal.create.mockResolvedValue(created);

    const res = await POST(makeRequest(body));
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.name).toBe("Test Flip");
    expect(mockPrisma.deal.create).toHaveBeenCalledTimes(1);
  });

  it("returns 400 when body fails validation (missing name)", async () => {
    const { POST } = await import("@/api/deals/route");

    const res = await POST(makeRequest({ purchasePrice: 500000 }));
    expect(res.status).toBe(400);
  });
});

// ===========================================================================
// 4 - Route handler: PATCH /api/deals/[dealId] (update deal)
// ===========================================================================

describe("PATCH /api/deals/[dealId] - update deal", () => {
  it("returns 404 for non-existent deal", async () => {
    const { PATCH } = await import("@/api/deals/[dealId]/route");

    mockPrisma.deal.findFirst.mockResolvedValue(null);

    const req = new Request("http://localhost/api/deals/deal-999", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Updated" }),
    }) as unknown as import("next/server").NextRequest;

    const params = { params: Promise.resolve({ dealId: "deal-999" }) };
    const res = await PATCH(req, params);

    expect(res.status).toBe(404);
  });

  it("rejects invalid stage transition (backward by more than one)", async () => {
    const { PATCH } = await import("@/api/deals/[dealId]/route");

    mockPrisma.deal.findFirst.mockResolvedValue({
      id: "deal-1",
      orgId: "org-1",
      stage: "renovating",
      purchasePrice: 1000000,
      purchaseDate: new Date(),
      expectedSalePrice: 2000000,
      actualSalePrice: null,
      soldDate: null,
      actualSaleDate: null,
    });

    const req = new Request("http://localhost/api/deals/deal-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage: "lead" }),
    }) as unknown as import("next/server").NextRequest;

    const params = { params: Promise.resolve({ dealId: "deal-1" }) };
    const res = await PATCH(req, params);

    expect(res.status).toBe(400);
  });

  it("allows forward stage transition", async () => {
    const { PATCH } = await import("@/api/deals/[dealId]/route");

    const existing = {
      id: "deal-1",
      orgId: "org-1",
      stage: "lead",
      purchasePrice: 0,
      purchaseDate: null,
      expectedSalePrice: 0,
      actualSalePrice: null,
      soldDate: null,
      actualSaleDate: null,
    };
    mockPrisma.deal.findFirst.mockResolvedValue(existing);
    mockPrisma.deal.update.mockResolvedValue({ ...existing, stage: "analysing" });

    const req = new Request("http://localhost/api/deals/deal-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage: "analysing" }),
    }) as unknown as import("next/server").NextRequest;

    const params = { params: Promise.resolve({ dealId: "deal-1" }) };
    const res = await PATCH(req, params);

    expect(res.status).toBe(200);
  });

  it("rejects moving to 'purchased' without purchasePrice and purchaseDate", async () => {
    const { PATCH } = await import("@/api/deals/[dealId]/route");

    mockPrisma.deal.findFirst.mockResolvedValue({
      id: "deal-1",
      orgId: "org-1",
      stage: "offer_made",
      purchasePrice: 0,
      purchaseDate: null,
      expectedSalePrice: 0,
      actualSalePrice: null,
      soldDate: null,
      actualSaleDate: null,
    });

    const req = new Request("http://localhost/api/deals/deal-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage: "purchased" }),
    }) as unknown as import("next/server").NextRequest;

    const params = { params: Promise.resolve({ dealId: "deal-1" }) };
    const res = await PATCH(req, params);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("purchase price is required");
  });
});

// ===========================================================================
// 5 - Route handler: DELETE /api/deals/[dealId]
// ===========================================================================

describe("DELETE /api/deals/[dealId]", () => {
  it("deletes a deal and returns success", async () => {
    const { DELETE } = await import("@/api/deals/[dealId]/route");

    mockPrisma.deal.findFirst.mockResolvedValue({ id: "deal-1", orgId: "org-1" });
    mockPrisma.deal.delete.mockResolvedValue({});

    const req = new Request("http://localhost/api/deals/deal-1", {
      method: "DELETE",
    }) as unknown as import("next/server").NextRequest;

    const params = { params: Promise.resolve({ dealId: "deal-1" }) };
    const res = await DELETE(req, params);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.deleted).toBe(true);
  });

  it("returns 404 for non-existent deal", async () => {
    const { DELETE } = await import("@/api/deals/[dealId]/route");

    mockPrisma.deal.findFirst.mockResolvedValue(null);

    const req = new Request("http://localhost/api/deals/deal-999", {
      method: "DELETE",
    }) as unknown as import("next/server").NextRequest;

    const params = { params: Promise.resolve({ dealId: "deal-999" }) };
    const res = await DELETE(req, params);

    expect(res.status).toBe(404);
  });
});
