import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Mock setup: prisma, auth, permissions
// ---------------------------------------------------------------------------

const mockPrisma = {
  document: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
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
// Helper: build a NextRequest-like object
// ---------------------------------------------------------------------------

function makeRequest(body?: unknown, url = "http://localhost/api/documents") {
  return new Request(url, {
    method: body ? "POST" : "GET",
    headers: { "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  }) as unknown as import("next/server").NextRequest;
}

// ---------------------------------------------------------------------------
// Inline schema (mirrors the one defined in the route file)
// ---------------------------------------------------------------------------

const createDocumentSchema = z.object({
  dealId: z.string().optional(),
  name: z.string().min(1),
  type: z.string().min(1),
  url: z.string().optional(),
  notes: z.string().optional(),
});

// ===========================================================================
// 1 - createDocumentSchema validation
// ===========================================================================

describe("createDocumentSchema", () => {
  const validDoc = { name: "Floor Plan", type: "blueprint" };

  it("accepts a valid document with required fields only", () => {
    expect(createDocumentSchema.safeParse(validDoc).success).toBe(true);
  });

  it("accepts a document with all optional fields populated", () => {
    const result = createDocumentSchema.safeParse({
      ...validDoc,
      dealId: "deal-1",
      url: "https://storage.example.com/file.pdf",
      notes: "Ground floor layout",
    });
    expect(result.success).toBe(true);
  });

  it("rejects when name is missing", () => {
    const { name: _, ...rest } = validDoc;
    expect(createDocumentSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects when name is empty string", () => {
    expect(createDocumentSchema.safeParse({ ...validDoc, name: "" }).success).toBe(false);
  });

  it("rejects when type is missing", () => {
    const { type: _, ...rest } = validDoc;
    expect(createDocumentSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects when type is empty string", () => {
    expect(createDocumentSchema.safeParse({ ...validDoc, type: "" }).success).toBe(false);
  });
});

// ===========================================================================
// 2 - Route handler: POST /api/documents (create document)
// ===========================================================================

describe("POST /api/documents - create document", () => {
  it("creates a document and returns 201", async () => {
    const { POST } = await import("@/api/documents/route");
    const body = { name: "Title Deed", type: "legal" };

    const created = { id: "doc-1", orgId: "org-1", userId: "user-1", ...body };
    mockPrisma.document.create.mockResolvedValue(created);

    const res = await POST(makeRequest(body));
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.name).toBe("Title Deed");
    expect(json.type).toBe("legal");
  });

  it("returns 400 when name is missing", async () => {
    const { POST } = await import("@/api/documents/route");
    const res = await POST(makeRequest({ type: "photo" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when type is missing", async () => {
    const { POST } = await import("@/api/documents/route");
    const res = await POST(makeRequest({ name: "Photo" }));
    expect(res.status).toBe(400);
  });
});

// ===========================================================================
// 3 - Route handler: DELETE /api/documents/[documentId]
// ===========================================================================

describe("DELETE /api/documents/[documentId]", () => {
  it("returns 404 for non-existent document", async () => {
    const { DELETE } = await import("@/api/documents/[documentId]/route");
    mockPrisma.document.findFirst.mockResolvedValue(null);

    const req = new Request("http://localhost/api/documents/doc-999", {
      method: "DELETE",
    }) as unknown as import("next/server").NextRequest;
    const params = { params: Promise.resolve({ documentId: "doc-999" }) };
    const res = await DELETE(req, params);

    expect(res.status).toBe(404);
  });
});
