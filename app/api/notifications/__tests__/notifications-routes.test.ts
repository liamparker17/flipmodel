import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock setup: prisma, auth, permissions, email
// ---------------------------------------------------------------------------

const mockPrisma = {
  notification: {
    findMany: vi.fn(),
    count: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
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

vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn().mockResolvedValue({ success: true }),
  budgetAlertEmail: vi.fn().mockReturnValue({ to: "", subject: "Budget", html: "", text: "" }),
  milestoneOverdueEmail: vi.fn().mockReturnValue({ to: "", subject: "Overdue", html: "", text: "" }),
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

function makeRequest(body?: unknown, url = "http://localhost/api/notifications") {
  const req = new Request(url, {
    method: body ? "POST" : "GET",
    headers: { "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  // Attach nextUrl so route handlers that use req.nextUrl.searchParams work
  (req as any).nextUrl = new URL(url);
  return req as unknown as import("next/server").NextRequest;
}

// ===========================================================================
// 1 - GET /api/notifications
// ===========================================================================

describe("GET /api/notifications", () => {
  it("returns paginated notifications", async () => {
    const { GET } = await import("@/api/notifications/route");

    mockPrisma.notification.count.mockResolvedValue(2);
    mockPrisma.notification.findMany.mockResolvedValue([
      { id: "n-1", title: "Alert", read: false },
      { id: "n-2", title: "Info", read: true },
    ]);

    const res = await GET(makeRequest(undefined, "http://localhost/api/notifications"));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data).toHaveLength(2);
  });
});

// ===========================================================================
// 2 - POST /api/notifications (markRead)
// ===========================================================================

describe("POST /api/notifications - markRead", () => {
  it("marks specific notifications as read", async () => {
    const { POST } = await import("@/api/notifications/route");

    mockPrisma.notification.updateMany.mockResolvedValue({ count: 2 });

    const res = await POST(makeRequest({ action: "markRead", ids: ["n-1", "n-2"] }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.updated).toBe(2);
    expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: { in: ["n-1", "n-2"] } }),
        data: { read: true },
      })
    );
  });
});

// ===========================================================================
// 3 - POST /api/notifications (markAllRead)
// ===========================================================================

describe("POST /api/notifications - markAllRead", () => {
  it("marks all unread notifications as read", async () => {
    const { POST } = await import("@/api/notifications/route");

    mockPrisma.notification.updateMany.mockResolvedValue({ count: 5 });

    const res = await POST(makeRequest({ action: "markAllRead" }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.updated).toBe(5);
    expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: "user-1", orgId: "org-1", read: false }),
        data: { read: true },
      })
    );
  });
});

// ===========================================================================
// 4 - POST /api/notifications (unknown action returns ok)
// ===========================================================================

describe("POST /api/notifications - unknown action", () => {
  it("returns ok for unrecognised action", async () => {
    const { POST } = await import("@/api/notifications/route");

    const res = await POST(makeRequest({ action: "something_else" }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
  });
});

// ===========================================================================
// 5 - POST /api/notifications/send
// ===========================================================================

describe("POST /api/notifications/send", () => {
  it("returns sent: 0 when no pending notifications", async () => {
    const { POST } = await import("@/api/notifications/send/route");

    mockPrisma.notification.findMany.mockResolvedValue([]);

    const res = await POST(makeRequest({}, "http://localhost/api/notifications/send"));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.sent).toBe(0);
    expect(json.message).toBe("No pending notifications");
  });

  it("sends emails for unread notifications and returns count", async () => {
    const { POST } = await import("@/api/notifications/send/route");
    const { sendEmail } = await import("@/lib/email");

    mockPrisma.notification.findMany.mockResolvedValue([
      {
        id: "n-1",
        title: "Budget Alert",
        message: "Budget is at 90%",
        type: "budget_alert",
        metadata: { dealName: "Sunset Villa" },
        user: { email: "user@example.com", name: "Test" },
      },
    ]);
    mockPrisma.notification.update.mockResolvedValue({});
    (sendEmail as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });

    const res = await POST(makeRequest({}, "http://localhost/api/notifications/send"));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.sent).toBe(1);
    expect(json.total).toBe(1);
  });

  it("tracks errors when email sending fails", async () => {
    const { POST } = await import("@/api/notifications/send/route");
    const { sendEmail } = await import("@/lib/email");

    mockPrisma.notification.findMany.mockResolvedValue([
      {
        id: "n-2",
        title: "Test",
        message: "Test message",
        type: "general",
        metadata: {},
        user: { email: "user@example.com", name: "Test" },
      },
    ]);
    (sendEmail as ReturnType<typeof vi.fn>).mockResolvedValue({ success: false, error: "SMTP down" });

    const res = await POST(makeRequest({}, "http://localhost/api/notifications/send"));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.sent).toBe(0);
    expect(json.errors).toHaveLength(1);
    expect(json.errors[0]).toContain("SMTP down");
  });
});
