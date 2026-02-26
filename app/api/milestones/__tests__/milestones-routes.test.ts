import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Mock setup: prisma, auth, permissions
// ---------------------------------------------------------------------------

const mockPrisma = {
  milestone: {
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

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function makeRequest(body?: unknown, url = "http://localhost/api/milestones") {
  return new Request(url, {
    method: body ? "POST" : "GET",
    headers: { "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  }) as unknown as import("next/server").NextRequest;
}

// ---------------------------------------------------------------------------
// Inline schemas (mirrors the route definitions)
// ---------------------------------------------------------------------------

const createMilestoneSchema = z.object({
  dealId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  dueDate: z.string().optional(),
  status: z.string().optional(),
  order: z.number().int().optional(),
  assignedContractorId: z.string().optional(),
  assignedToMemberId: z.string().optional(),
  roomId: z.string().optional(),
  tasks: z.array(z.object({
    title: z.string().min(1),
    assignedTo: z.string().optional(),
    dueDate: z.string().optional(),
  })).optional(),
});

const updateMilestoneSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  dueDate: z.string().nullable().optional(),
  completedDate: z.string().nullable().optional(),
  status: z.string().optional(),
  order: z.number().int().optional(),
  assignedContractorId: z.string().nullable().optional(),
  assignedToMemberId: z.string().nullable().optional(),
  roomId: z.string().nullable().optional(),
  inspectionStatus: z.string().nullable().optional(),
  inspectionNotes: z.string().nullable().optional(),
});

// ===========================================================================
// 1 - createMilestoneSchema validation
// ===========================================================================

describe("createMilestoneSchema", () => {
  const validMilestone = { dealId: "deal-1", title: "Roof Installation" };

  it("accepts a valid milestone with required fields only", () => {
    expect(createMilestoneSchema.safeParse(validMilestone).success).toBe(true);
  });

  it("accepts a milestone with all optional fields", () => {
    const result = createMilestoneSchema.safeParse({
      ...validMilestone,
      description: "Install new roof tiles",
      dueDate: "2026-05-01",
      status: "in_progress",
      order: 3,
      assignedContractorId: "contractor-1",
      assignedToMemberId: "member-2",
      roomId: "room-1",
      tasks: [{ title: "Remove old tiles" }, { title: "Install new tiles", assignedTo: "worker-1", dueDate: "2026-04-28" }],
    });
    expect(result.success).toBe(true);
  });

  it("rejects when dealId is missing", () => {
    expect(createMilestoneSchema.safeParse({ title: "Test" }).success).toBe(false);
  });

  it("rejects when dealId is empty string", () => {
    expect(createMilestoneSchema.safeParse({ dealId: "", title: "Test" }).success).toBe(false);
  });

  it("rejects when title is missing", () => {
    expect(createMilestoneSchema.safeParse({ dealId: "deal-1" }).success).toBe(false);
  });

  it("rejects when title is empty string", () => {
    expect(createMilestoneSchema.safeParse({ dealId: "deal-1", title: "" }).success).toBe(false);
  });

  it("rejects tasks with empty title", () => {
    const result = createMilestoneSchema.safeParse({
      ...validMilestone,
      tasks: [{ title: "" }],
    });
    expect(result.success).toBe(false);
  });
});

// ===========================================================================
// 2 - updateMilestoneSchema validation
// ===========================================================================

describe("updateMilestoneSchema", () => {
  it("accepts empty object (all fields optional)", () => {
    expect(updateMilestoneSchema.safeParse({}).success).toBe(true);
  });

  it("accepts partial update with status change", () => {
    expect(updateMilestoneSchema.safeParse({ status: "completed" }).success).toBe(true);
  });

  it("accepts nullable fields set to null", () => {
    const result = updateMilestoneSchema.safeParse({
      dueDate: null,
      completedDate: null,
      assignedContractorId: null,
      roomId: null,
    });
    expect(result.success).toBe(true);
  });

  it("accepts inspection fields", () => {
    const result = updateMilestoneSchema.safeParse({
      inspectionStatus: "passed",
      inspectionNotes: "All work meets standard",
    });
    expect(result.success).toBe(true);
  });
});

// ===========================================================================
// 3 - Route handler: POST /api/milestones (create milestone)
// ===========================================================================

describe("POST /api/milestones - create milestone", () => {
  it("creates a milestone and returns 201", async () => {
    const { POST } = await import("@/api/milestones/route");
    const body = { dealId: "deal-1", title: "Plumbing Phase" };

    const created = {
      id: "ms-1",
      orgId: "org-1",
      ...body,
      status: "pending",
      order: 0,
      tasks: [],
    };
    mockPrisma.milestone.create.mockResolvedValue(created);

    const res = await POST(makeRequest(body));
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.title).toBe("Plumbing Phase");
    expect(json.status).toBe("pending");
  });

  it("returns 400 when dealId is missing", async () => {
    const { POST } = await import("@/api/milestones/route");
    const res = await POST(makeRequest({ title: "No Deal" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when title is missing", async () => {
    const { POST } = await import("@/api/milestones/route");
    const res = await POST(makeRequest({ dealId: "deal-1" }));
    expect(res.status).toBe(400);
  });
});

// ===========================================================================
// 4 - Route handler: PATCH /api/milestones/[milestoneId]
// ===========================================================================

describe("PATCH /api/milestones/[milestoneId]", () => {
  it("returns 404 for non-existent milestone", async () => {
    const { PATCH } = await import("@/api/milestones/[milestoneId]/route");
    mockPrisma.milestone.findFirst.mockResolvedValue(null);

    const req = new Request("http://localhost/api/milestones/ms-999", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "completed" }),
    }) as unknown as import("next/server").NextRequest;
    const params = { params: Promise.resolve({ milestoneId: "ms-999" }) };
    const res = await PATCH(req, params);

    expect(res.status).toBe(404);
  });
});

// ===========================================================================
// 5 - Route handler: DELETE /api/milestones/[milestoneId]
// ===========================================================================

describe("DELETE /api/milestones/[milestoneId]", () => {
  it("returns 404 for non-existent milestone", async () => {
    const { DELETE } = await import("@/api/milestones/[milestoneId]/route");
    mockPrisma.milestone.findFirst.mockResolvedValue(null);

    const req = new Request("http://localhost/api/milestones/ms-999", {
      method: "DELETE",
    }) as unknown as import("next/server").NextRequest;
    const params = { params: Promise.resolve({ milestoneId: "ms-999" }) };
    const res = await DELETE(req, params);

    expect(res.status).toBe(404);
  });
});
