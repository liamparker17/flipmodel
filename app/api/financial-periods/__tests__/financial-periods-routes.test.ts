import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Mock setup: prisma, auth, permissions, audit
// ---------------------------------------------------------------------------

const mockPrisma = {
  financialPeriod: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    count: vi.fn(),
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

function makeRequest(body?: unknown, url = "http://localhost/api/financial-periods") {
  return new Request(url, {
    method: body ? "POST" : "GET",
    headers: { "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  }) as unknown as import("next/server").NextRequest;
}

// ---------------------------------------------------------------------------
// Inline schema (mirrors the route definition)
// ---------------------------------------------------------------------------

const createFinancialPeriodSchema = z.object({
  name: z.string().min(1),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
});

// ===========================================================================
// 1 - createFinancialPeriodSchema validation
// ===========================================================================

describe("createFinancialPeriodSchema", () => {
  const validPeriod = { name: "FY2026 Q1", startDate: "2026-03-01", endDate: "2026-05-31" };

  it("accepts a valid period with all required fields", () => {
    expect(createFinancialPeriodSchema.safeParse(validPeriod).success).toBe(true);
  });

  it("rejects when name is missing", () => {
    const { name: _, ...rest } = validPeriod;
    expect(createFinancialPeriodSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects when name is empty string", () => {
    expect(createFinancialPeriodSchema.safeParse({ ...validPeriod, name: "" }).success).toBe(false);
  });

  it("rejects when startDate is missing", () => {
    const { startDate: _, ...rest } = validPeriod;
    expect(createFinancialPeriodSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects when endDate is missing", () => {
    const { endDate: _, ...rest } = validPeriod;
    expect(createFinancialPeriodSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects when startDate is empty string", () => {
    expect(createFinancialPeriodSchema.safeParse({ ...validPeriod, startDate: "" }).success).toBe(false);
  });

  it("rejects when endDate is empty string", () => {
    expect(createFinancialPeriodSchema.safeParse({ ...validPeriod, endDate: "" }).success).toBe(false);
  });
});

// ===========================================================================
// 2 - Route handler: POST /api/financial-periods (create period)
// ===========================================================================

describe("POST /api/financial-periods - create period", () => {
  it("creates a financial period and returns 201", async () => {
    const { POST } = await import("@/api/financial-periods/route");
    const body = { name: "FY2026 Q1", startDate: "2026-03-01", endDate: "2026-05-31" };

    const created = {
      id: "fp-1",
      orgId: "org-1",
      ...body,
      status: "open",
      startDate: new Date("2026-03-01"),
      endDate: new Date("2026-05-31"),
    };
    mockPrisma.financialPeriod.create.mockResolvedValue(created);

    const res = await POST(makeRequest(body));
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.name).toBe("FY2026 Q1");
  });

  it("returns 400 when name is missing", async () => {
    const { POST } = await import("@/api/financial-periods/route");
    const res = await POST(makeRequest({ startDate: "2026-03-01", endDate: "2026-05-31" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when startDate is missing", async () => {
    const { POST } = await import("@/api/financial-periods/route");
    const res = await POST(makeRequest({ name: "Q1", endDate: "2026-05-31" }));
    expect(res.status).toBe(400);
  });
});

// ===========================================================================
// 3 - Route handler: POST /api/financial-periods/[periodId]/close
// ===========================================================================

describe("POST /api/financial-periods/[periodId]/close", () => {
  it("closes an open period", async () => {
    const { POST } = await import("@/api/financial-periods/[periodId]/close/route");

    const existing = { id: "fp-1", orgId: "org-1", status: "open", name: "FY2026 Q1" };
    mockPrisma.financialPeriod.findFirst.mockResolvedValue(existing);
    mockPrisma.financialPeriod.update.mockResolvedValue({
      ...existing,
      status: "closed",
      closedBy: "user-1",
      closedAt: new Date(),
    });

    const req = makeRequest({}, "http://localhost/api/financial-periods/fp-1/close");
    const params = { params: Promise.resolve({ periodId: "fp-1" }) };
    const res = await POST(req, params);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.status).toBe("closed");
  });

  it("rejects closing a non-open period", async () => {
    const { POST } = await import("@/api/financial-periods/[periodId]/close/route");

    mockPrisma.financialPeriod.findFirst.mockResolvedValue({
      id: "fp-1",
      orgId: "org-1",
      status: "closed",
      name: "Already Closed",
    });

    const req = makeRequest({}, "http://localhost/api/financial-periods/fp-1/close");
    const params = { params: Promise.resolve({ periodId: "fp-1" }) };
    const res = await POST(req, params);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("Only open periods can be closed");
  });

  it("returns 404 for non-existent period", async () => {
    const { POST } = await import("@/api/financial-periods/[periodId]/close/route");

    mockPrisma.financialPeriod.findFirst.mockResolvedValue(null);

    const req = makeRequest({}, "http://localhost/api/financial-periods/fp-999/close");
    const params = { params: Promise.resolve({ periodId: "fp-999" }) };
    const res = await POST(req, params);

    expect(res.status).toBe(404);
  });
});
