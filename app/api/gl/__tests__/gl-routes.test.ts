import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createJournalEntrySchema,
  updateJournalEntrySchema,
  postJournalEntrySchema,
} from "@/lib/validations/gl";

// ---------------------------------------------------------------------------
// Mock setup: prisma, auth, audit
// ---------------------------------------------------------------------------

const mockPrisma = {
  journalEntry: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  journalLine: { deleteMany: vi.fn() },
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

// Stub orgMember for requireOrgMember / requirePermission
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

vi.mock("@/lib/permissions", () => ({
  hasPermission: vi.fn().mockReturnValue(true),
  canAccessModule: vi.fn().mockReturnValue(true),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.orgMember.findFirst.mockResolvedValue(ORG_MEMBER);
});

// ---------------------------------------------------------------------------
// Helper: build a NextRequest-like object
// ---------------------------------------------------------------------------

function makeRequest(body?: unknown, url = "http://localhost/api/gl") {
  return new Request(url, {
    method: body ? "POST" : "GET",
    headers: { "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  }) as unknown as import("next/server").NextRequest;
}

// ===========================================================================
// 1 - createJournalEntrySchema validation
// ===========================================================================

describe("createJournalEntrySchema", () => {
  const validEntry = {
    date: "2026-01-15",
    description: "Test journal entry",
    lines: [
      { accountCode: "1000", accountName: "Cash", debit: 500, credit: 0 },
      { accountCode: "4000", accountName: "Revenue", debit: 0, credit: 500 },
    ],
  };

  it("accepts a valid balanced entry", () => {
    expect(createJournalEntrySchema.safeParse(validEntry).success).toBe(true);
  });

  it("rejects when total debits do not equal total credits", () => {
    const result = createJournalEntrySchema.safeParse({
      ...validEntry,
      lines: [
        { accountCode: "1000", accountName: "Cash", debit: 500, credit: 0 },
        { accountCode: "4000", accountName: "Revenue", debit: 0, credit: 300 },
      ],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message.includes("debits must equal"))).toBe(true);
    }
  });

  it("rejects an empty lines array", () => {
    const result = createJournalEntrySchema.safeParse({ ...validEntry, lines: [] });
    expect(result.success).toBe(false);
  });

  it("rejects when date is missing", () => {
    const { date: _, ...rest } = validEntry;
    expect(createJournalEntrySchema.safeParse(rest).success).toBe(false);
  });

  it("rejects when description is missing", () => {
    const { description: _, ...rest } = validEntry;
    expect(createJournalEntrySchema.safeParse(rest).success).toBe(false);
  });

  it("rejects negative debit amounts", () => {
    const result = createJournalEntrySchema.safeParse({
      ...validEntry,
      lines: [
        { accountCode: "1000", accountName: "Cash", debit: -500, credit: 0 },
        { accountCode: "4000", accountName: "Revenue", debit: 0, credit: -500 },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("accepts entry with optional fields populated", () => {
    const result = createJournalEntrySchema.safeParse({
      ...validEntry,
      reference: "REF-001",
      sourceType: "invoice",
      sourceId: "inv-123",
      notes: "Some notes",
    });
    expect(result.success).toBe(true);
  });

  it("tolerates floating-point rounding within 0.001", () => {
    const result = createJournalEntrySchema.safeParse({
      date: "2026-03-01",
      description: "Float tolerance",
      lines: [
        { accountCode: "1000", accountName: "Cash", debit: 33.33, credit: 0 },
        { accountCode: "1001", accountName: "Cash 2", debit: 33.33, credit: 0 },
        { accountCode: "1002", accountName: "Cash 3", debit: 33.34, credit: 0 },
        { accountCode: "4000", accountName: "Revenue", debit: 0, credit: 100 },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects when a line is missing accountCode", () => {
    const result = createJournalEntrySchema.safeParse({
      ...validEntry,
      lines: [
        { accountName: "Cash", debit: 100, credit: 0 },
        { accountCode: "4000", accountName: "Revenue", debit: 0, credit: 100 },
      ],
    });
    expect(result.success).toBe(false);
  });
});

// ===========================================================================
// 2 - updateJournalEntrySchema validation
// ===========================================================================

describe("updateJournalEntrySchema", () => {
  it("accepts partial update with only description", () => {
    const result = updateJournalEntrySchema.safeParse({ description: "Updated" });
    expect(result.success).toBe(true);
  });

  it("accepts empty object (all fields optional)", () => {
    const result = updateJournalEntrySchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts status change", () => {
    const result = updateJournalEntrySchema.safeParse({ status: "posted" });
    expect(result.success).toBe(true);
  });

  it("accepts lines in update", () => {
    const result = updateJournalEntrySchema.safeParse({
      lines: [
        { accountCode: "1000", accountName: "Cash", debit: 200, credit: 0 },
      ],
    });
    expect(result.success).toBe(true);
  });
});

// ===========================================================================
// 3 - Route handler: POST /api/gl (create journal entry)
// ===========================================================================

describe("POST /api/gl - create journal entry", () => {
  it("creates a draft journal entry and returns 201", async () => {
    const { POST } = await import("@/api/gl/route");
    const body = {
      date: "2026-01-15",
      description: "Test",
      lines: [
        { accountCode: "1000", accountName: "Cash", debit: 1000, credit: 0 },
        { accountCode: "4000", accountName: "Revenue", debit: 0, credit: 1000 },
      ],
    };

    mockPrisma.journalEntry.count.mockResolvedValue(5);
    const createdEntry = { id: "je-1", entryNumber: "JE-000006", status: "draft", ...body, lines: body.lines };
    mockPrisma.journalEntry.create.mockResolvedValue(createdEntry);

    const res = await POST(makeRequest(body));
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.entryNumber).toBe("JE-000006");
    expect(json.status).toBe("draft");
  });

  it("returns 400 when body fails validation (unbalanced)", async () => {
    const { POST } = await import("@/api/gl/route");
    const body = {
      date: "2026-01-15",
      description: "Unbalanced",
      lines: [
        { accountCode: "1000", accountName: "Cash", debit: 1000, credit: 0 },
        { accountCode: "4000", accountName: "Revenue", debit: 0, credit: 500 },
      ],
    };

    const res = await POST(makeRequest(body));
    expect(res.status).toBe(400);
  });
});

// ===========================================================================
// 4 - Route handler: POST /api/gl/[entryId]/post (post journal entry)
// ===========================================================================

describe("POST /api/gl/[entryId]/post - post journal entry", () => {
  it("changes status from draft to posted", async () => {
    const { POST } = await import("@/api/gl/[entryId]/post/route");

    const existing = { id: "je-1", orgId: "org-1", status: "draft", entryNumber: "JE-000001" };
    mockPrisma.journalEntry.findFirst.mockResolvedValue(existing);
    mockPrisma.journalEntry.update.mockResolvedValue({
      ...existing,
      status: "posted",
      postedAt: new Date(),
      postedBy: "user-1",
      lines: [],
    });

    const req = makeRequest({}, "http://localhost/api/gl/je-1/post");
    const params = { params: Promise.resolve({ entryId: "je-1" }) };
    const res = await POST(req, params);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.status).toBe("posted");
  });

  it("rejects posting an already-posted entry", async () => {
    const { POST } = await import("@/api/gl/[entryId]/post/route");

    mockPrisma.journalEntry.findFirst.mockResolvedValue({
      id: "je-1",
      orgId: "org-1",
      status: "posted",
    });

    const req = makeRequest({}, "http://localhost/api/gl/je-1/post");
    const params = { params: Promise.resolve({ entryId: "je-1" }) };
    const res = await POST(req, params);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("Only draft entries can be posted");
  });

  it("returns 404 for non-existent entry", async () => {
    const { POST } = await import("@/api/gl/[entryId]/post/route");
    mockPrisma.journalEntry.findFirst.mockResolvedValue(null);

    const req = makeRequest({}, "http://localhost/api/gl/je-999/post");
    const params = { params: Promise.resolve({ entryId: "je-999" }) };
    const res = await POST(req, params);

    expect(res.status).toBe(404);
  });
});

// ===========================================================================
// 5 - Route handler: PATCH /api/gl/[entryId] (update journal entry)
// ===========================================================================

describe("PATCH /api/gl/[entryId] - update journal entry", () => {
  it("rejects updates to non-draft entries", async () => {
    const { PATCH } = await import("@/api/gl/[entryId]/route");

    mockPrisma.journalEntry.findFirst.mockResolvedValue({
      id: "je-1",
      orgId: "org-1",
      status: "posted",
      lines: [],
    });

    const req = new Request("http://localhost/api/gl/je-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description: "Updated" }),
    }) as unknown as import("next/server").NextRequest;

    const params = { params: Promise.resolve({ entryId: "je-1" }) };
    const res = await PATCH(req, params);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("Only draft entries can be updated");
  });
});
