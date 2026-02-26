import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Mock setup: prisma, auth, permissions
// ---------------------------------------------------------------------------

const mockPrisma = {
  organisation: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  orgMember: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  department: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
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
  canManageRole: vi.fn().mockReturnValue(true),
}));

vi.mock("bcryptjs", () => ({
  default: { hash: vi.fn().mockResolvedValue("hashed-password") },
}));

const ORG_MEMBER = {
  id: "member-1",
  orgId: "org-1",
  userId: "user-1",
  role: "executive",
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

function makeRequest(body?: unknown, url = "http://localhost/api/org") {
  return new Request(url, {
    method: body ? "POST" : "GET",
    headers: { "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  }) as unknown as import("next/server").NextRequest;
}

function makePatchRequest(body: unknown, url = "http://localhost/api/org") {
  return new Request(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as import("next/server").NextRequest;
}

function makeDeleteRequest(url: string) {
  const req = new Request(url, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
  });
  (req as any).nextUrl = new URL(url);
  return req as unknown as import("next/server").NextRequest;
}

// ---------------------------------------------------------------------------
// Inline schemas (mirrors the route definitions)
// ---------------------------------------------------------------------------

const createOrgSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
  currency: z.string().optional(),
  timezone: z.string().optional(),
});

const updateOrgSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/).optional(),
  logo: z.string().nullable().optional(),
  currency: z.string().optional(),
  timezone: z.string().optional(),
  settings: z.any().optional(),
});

const inviteMemberSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email(),
  password: z.string().min(8).optional(),
  role: z.enum(["executive", "finance_manager", "project_manager", "site_supervisor", "field_worker", "viewer"]),
  departmentId: z.string().optional(),
  title: z.string().optional(),
});

const createDepartmentSchema = z.object({
  name: z.string().min(1).max(100),
  parentId: z.string().nullable().optional(),
});

// ===========================================================================
// 1 - createOrgSchema validation
// ===========================================================================

describe("createOrgSchema", () => {
  const validOrg = { name: "FlipCo", slug: "flipco" };

  it("accepts a valid org with required fields", () => {
    expect(createOrgSchema.safeParse(validOrg).success).toBe(true);
  });

  it("accepts org with optional currency and timezone", () => {
    const result = createOrgSchema.safeParse({ ...validOrg, currency: "USD", timezone: "UTC" });
    expect(result.success).toBe(true);
  });

  it("rejects when name is missing", () => {
    expect(createOrgSchema.safeParse({ slug: "flipco" }).success).toBe(false);
  });

  it("rejects when name is empty", () => {
    expect(createOrgSchema.safeParse({ name: "", slug: "flipco" }).success).toBe(false);
  });

  it("rejects when slug is missing", () => {
    expect(createOrgSchema.safeParse({ name: "FlipCo" }).success).toBe(false);
  });

  it("rejects slug with uppercase characters", () => {
    expect(createOrgSchema.safeParse({ name: "FlipCo", slug: "FlipCo" }).success).toBe(false);
  });

  it("rejects slug with spaces", () => {
    expect(createOrgSchema.safeParse({ name: "FlipCo", slug: "flip co" }).success).toBe(false);
  });

  it("rejects slug shorter than 2 characters", () => {
    expect(createOrgSchema.safeParse({ name: "FlipCo", slug: "a" }).success).toBe(false);
  });

  it("accepts slug with hyphens", () => {
    expect(createOrgSchema.safeParse({ name: "FlipCo", slug: "flip-co" }).success).toBe(true);
  });

  it("rejects name longer than 100 characters", () => {
    const result = createOrgSchema.safeParse({ name: "a".repeat(101), slug: "flipco" });
    expect(result.success).toBe(false);
  });
});

// ===========================================================================
// 2 - updateOrgSchema validation
// ===========================================================================

describe("updateOrgSchema", () => {
  it("accepts empty object (all fields optional)", () => {
    expect(updateOrgSchema.safeParse({}).success).toBe(true);
  });

  it("accepts partial update with only name", () => {
    expect(updateOrgSchema.safeParse({ name: "New Name" }).success).toBe(true);
  });

  it("accepts logo set to null", () => {
    expect(updateOrgSchema.safeParse({ logo: null }).success).toBe(true);
  });

  it("rejects invalid slug format in update", () => {
    expect(updateOrgSchema.safeParse({ slug: "Has Spaces" }).success).toBe(false);
  });
});

// ===========================================================================
// 3 - inviteMemberSchema validation
// ===========================================================================

describe("inviteMemberSchema", () => {
  const validInvite = { name: "John Doe", email: "john@example.com", role: "field_worker" as const };

  it("accepts a valid invitation with required fields", () => {
    expect(inviteMemberSchema.safeParse(validInvite).success).toBe(true);
  });

  it("accepts invitation with optional password", () => {
    const result = inviteMemberSchema.safeParse({ ...validInvite, password: "securepass123" });
    expect(result.success).toBe(true);
  });

  it("rejects when name is missing", () => {
    expect(inviteMemberSchema.safeParse({ email: "john@example.com", role: "viewer" }).success).toBe(false);
  });

  it("rejects invalid email", () => {
    expect(inviteMemberSchema.safeParse({ name: "John", email: "not-an-email", role: "viewer" }).success).toBe(false);
  });

  it("rejects invalid role", () => {
    expect(inviteMemberSchema.safeParse({ name: "John", email: "john@example.com", role: "superadmin" }).success).toBe(false);
  });

  it("rejects password shorter than 8 characters", () => {
    const result = inviteMemberSchema.safeParse({ ...validInvite, password: "short" });
    expect(result.success).toBe(false);
  });

  it("accepts all valid roles", () => {
    const roles = ["executive", "finance_manager", "project_manager", "site_supervisor", "field_worker", "viewer"];
    for (const role of roles) {
      expect(inviteMemberSchema.safeParse({ ...validInvite, role }).success).toBe(true);
    }
  });
});

// ===========================================================================
// 4 - createDepartmentSchema validation
// ===========================================================================

describe("createDepartmentSchema", () => {
  it("accepts valid department with name only", () => {
    expect(createDepartmentSchema.safeParse({ name: "Engineering" }).success).toBe(true);
  });

  it("accepts department with parentId", () => {
    expect(createDepartmentSchema.safeParse({ name: "Frontend", parentId: "dept-1" }).success).toBe(true);
  });

  it("accepts department with null parentId", () => {
    expect(createDepartmentSchema.safeParse({ name: "HR", parentId: null }).success).toBe(true);
  });

  it("rejects when name is missing", () => {
    expect(createDepartmentSchema.safeParse({}).success).toBe(false);
  });

  it("rejects when name is empty", () => {
    expect(createDepartmentSchema.safeParse({ name: "" }).success).toBe(false);
  });

  it("rejects name longer than 100 characters", () => {
    expect(createDepartmentSchema.safeParse({ name: "a".repeat(101) }).success).toBe(false);
  });
});

// ===========================================================================
// 5 - Route handler: POST /api/org (create organisation)
// ===========================================================================

describe("POST /api/org - create organisation", () => {
  it("creates an org and returns 201", async () => {
    const { POST } = await import("@/api/org/route");

    // requireAuth returns userId, no existing membership
    mockPrisma.orgMember.findFirst.mockResolvedValue(null);
    mockPrisma.organisation.findUnique.mockResolvedValue(null);
    mockPrisma.organisation.create.mockResolvedValue({
      id: "org-new",
      name: "FlipCo",
      slug: "flipco",
      currency: "ZAR",
      members: [],
    });

    const res = await POST(makeRequest({ name: "FlipCo", slug: "flipco" }));
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.name).toBe("FlipCo");
  });

  it("returns 400 when user already belongs to an org", async () => {
    const { POST } = await import("@/api/org/route");

    // User already has an active membership
    mockPrisma.orgMember.findFirst.mockResolvedValue(ORG_MEMBER);

    const res = await POST(makeRequest({ name: "FlipCo", slug: "flipco" }));

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("already belong");
  });

  it("returns 400 when slug is already taken", async () => {
    const { POST } = await import("@/api/org/route");

    mockPrisma.orgMember.findFirst.mockResolvedValue(null);
    mockPrisma.organisation.findUnique.mockResolvedValue({ id: "org-existing", slug: "flipco" });

    const res = await POST(makeRequest({ name: "FlipCo", slug: "flipco" }));

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("slug is already taken");
  });
});

// ===========================================================================
// 6 - Route handler: POST /api/org/departments (create department)
// ===========================================================================

describe("POST /api/org/departments - create department", () => {
  it("creates a department and returns 201", async () => {
    const { POST } = await import("@/api/org/departments/route");

    mockPrisma.department.create.mockResolvedValue({
      id: "dept-1",
      orgId: "org-1",
      name: "Construction",
      parentId: null,
    });

    const res = await POST(makeRequest({ name: "Construction" }, "http://localhost/api/org/departments"));
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.name).toBe("Construction");
  });

  it("returns 400 when department name is missing", async () => {
    const { POST } = await import("@/api/org/departments/route");
    const res = await POST(makeRequest({}, "http://localhost/api/org/departments"));
    expect(res.status).toBe(400);
  });
});

// ===========================================================================
// 7 - Route handler: DELETE /api/org/departments
// ===========================================================================

describe("DELETE /api/org/departments", () => {
  it("returns 400 when id query param is missing", async () => {
    const { DELETE } = await import("@/api/org/departments/route");
    const res = await DELETE(makeDeleteRequest("http://localhost/api/org/departments"));
    expect(res.status).toBe(400);
  });

  it("returns 404 when department does not exist", async () => {
    const { DELETE } = await import("@/api/org/departments/route");
    mockPrisma.department.findFirst.mockResolvedValue(null);
    const res = await DELETE(makeDeleteRequest("http://localhost/api/org/departments?id=dept-999"));
    expect(res.status).toBe(404);
  });
});

// ===========================================================================
// 8 - Route handler: DELETE /api/org/members
// ===========================================================================

describe("DELETE /api/org/members", () => {
  it("returns 400 when memberId query param is missing", async () => {
    const { DELETE } = await import("@/api/org/members/route");
    const res = await DELETE(makeDeleteRequest("http://localhost/api/org/members"));
    expect(res.status).toBe(400);
  });

  it("returns 400 when trying to remove yourself", async () => {
    const { DELETE } = await import("@/api/org/members/route");

    // Target member has same userId as the authenticated user
    mockPrisma.orgMember.findFirst.mockResolvedValue({ ...ORG_MEMBER, userId: "user-1" });

    const res = await DELETE(makeDeleteRequest("http://localhost/api/org/members?memberId=member-1"));

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("cannot remove yourself");
  });
});
