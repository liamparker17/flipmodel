import { describe, it, expect, vi, beforeEach } from "vitest";
import { createContactSchema, updateContactSchema } from "@/lib/validations/contact";

// ---------------------------------------------------------------------------
// Mock setup
// ---------------------------------------------------------------------------

const mockPrisma = {
  contact: {
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

vi.mock("@/lib/field-encryption", () => ({
  encryptSensitiveFields: vi.fn((data: Record<string, unknown>) => data),
  decryptSensitiveFields: vi.fn((data: Record<string, unknown>) => data),
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

function makeRequest(body?: unknown, url = "http://localhost/api/contacts") {
  return new Request(url, {
    method: body ? "POST" : "GET",
    headers: { "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  }) as unknown as import("next/server").NextRequest;
}

// ===========================================================================
// 1 - createContactSchema validation
// ===========================================================================

describe("createContactSchema", () => {
  const validContact = {
    name: "John Builder",
    role: "contractor",
    company: "Builder Bros",
    phone: "+27821234567",
    email: "john@builders.co.za",
  };

  it("accepts a valid contact with all fields", () => {
    expect(createContactSchema.safeParse(validContact).success).toBe(true);
  });

  it("accepts a minimal contact with only name", () => {
    expect(createContactSchema.safeParse({ name: "Jane" }).success).toBe(true);
  });

  it("rejects when name is missing", () => {
    const { name: _, ...rest } = validContact;
    expect(createContactSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects when name is empty string", () => {
    expect(createContactSchema.safeParse({ ...validContact, name: "" }).success).toBe(false);
  });

  it("rejects an invalid email address", () => {
    const result = createContactSchema.safeParse({ ...validContact, email: "not-an-email" });
    expect(result.success).toBe(false);
  });

  it("accepts empty string as email (opt-out)", () => {
    const result = createContactSchema.safeParse({ ...validContact, email: "" });
    expect(result.success).toBe(true);
  });

  it("accepts optional banking details", () => {
    const result = createContactSchema.safeParse({
      ...validContact,
      bankName: "FNB",
      accountNumber: "62012345678",
      branchCode: "250655",
      accountType: "cheque",
    });
    expect(result.success).toBe(true);
  });

  it("accepts optional profession and dailyRate for contractors", () => {
    const result = createContactSchema.safeParse({
      ...validContact,
      profession: "Electrician",
      dailyRate: 2500,
    });
    expect(result.success).toBe(true);
  });
});

// ===========================================================================
// 2 - updateContactSchema validation
// ===========================================================================

describe("updateContactSchema", () => {
  it("accepts an empty object (all fields optional)", () => {
    expect(updateContactSchema.safeParse({}).success).toBe(true);
  });

  it("accepts partial update with only phone", () => {
    expect(updateContactSchema.safeParse({ phone: "+27831112222" }).success).toBe(true);
  });

  it("rejects invalid email in partial update", () => {
    expect(updateContactSchema.safeParse({ email: "bad" }).success).toBe(false);
  });

  it("accepts name update", () => {
    expect(updateContactSchema.safeParse({ name: "Updated Name" }).success).toBe(true);
  });
});

// ===========================================================================
// 3 - Route handler: POST /api/contacts (create contact)
// ===========================================================================

describe("POST /api/contacts - create contact", () => {
  it("creates a contact and returns 201", async () => {
    const { POST } = await import("@/api/contacts/route");
    const body = { name: "Test Contact", role: "agent", email: "agent@test.com" };

    const created = { id: "contact-1", ...body, orgId: "org-1" };
    mockPrisma.contact.create.mockResolvedValue(created);

    const res = await POST(makeRequest(body));
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.name).toBe("Test Contact");
  });

  it("returns 400 when name is missing", async () => {
    const { POST } = await import("@/api/contacts/route");

    const res = await POST(makeRequest({ email: "no-name@test.com" }));
    expect(res.status).toBe(400);
  });
});

// ===========================================================================
// 4 - Route handler: PATCH /api/contacts/[contactId]
// ===========================================================================

describe("PATCH /api/contacts/[contactId]", () => {
  it("returns 404 for non-existent contact", async () => {
    const { PATCH } = await import("@/api/contacts/[contactId]/route");

    mockPrisma.contact.findFirst.mockResolvedValue(null);

    const req = new Request("http://localhost/api/contacts/c-999", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Updated" }),
    }) as unknown as import("next/server").NextRequest;

    const params = { params: Promise.resolve({ contactId: "c-999" }) };
    const res = await PATCH(req, params);

    expect(res.status).toBe(404);
  });

  it("updates a contact successfully", async () => {
    const { PATCH } = await import("@/api/contacts/[contactId]/route");

    mockPrisma.contact.findFirst.mockResolvedValue({ id: "c-1", orgId: "org-1", name: "Old" });
    mockPrisma.contact.update.mockResolvedValue({ id: "c-1", orgId: "org-1", name: "New" });

    const req = new Request("http://localhost/api/contacts/c-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "New" }),
    }) as unknown as import("next/server").NextRequest;

    const params = { params: Promise.resolve({ contactId: "c-1" }) };
    const res = await PATCH(req, params);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.name).toBe("New");
  });
});

// ===========================================================================
// 5 - Route handler: DELETE /api/contacts/[contactId]
// ===========================================================================

describe("DELETE /api/contacts/[contactId]", () => {
  it("deletes a contact and returns success", async () => {
    const { DELETE } = await import("@/api/contacts/[contactId]/route");

    mockPrisma.contact.findFirst.mockResolvedValue({ id: "c-1", orgId: "org-1" });
    mockPrisma.contact.delete.mockResolvedValue({});

    const req = new Request("http://localhost/api/contacts/c-1", {
      method: "DELETE",
    }) as unknown as import("next/server").NextRequest;

    const params = { params: Promise.resolve({ contactId: "c-1" }) };
    const res = await DELETE(req, params);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.deleted).toBe(true);
  });
});
