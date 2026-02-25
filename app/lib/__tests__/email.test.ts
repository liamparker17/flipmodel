import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the logger to avoid side effects
vi.mock("../logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import {
  sendEmail,
  budgetAlertEmail,
  milestoneOverdueEmail,
  expenseApprovalEmail,
  poApprovalEmail,
} from "../email";

describe("email templates", () => {
  describe("budgetAlertEmail", () => {
    it("returns correct subject with deal name and percentage", () => {
      const email = budgetAlertEmail("Test Deal", 85);
      expect(email.subject).toBe("Budget Alert: Test Deal at 85%");
    });

    it("contains the deal name and percentage in html", () => {
      const email = budgetAlertEmail("Sunrise Villa", 92);
      expect(email.html).toContain("Sunrise Villa");
      expect(email.html).toContain("92%");
    });

    it("contains the deal name and percentage in text", () => {
      const email = budgetAlertEmail("Sunrise Villa", 92);
      expect(email.text).toContain("Sunrise Villa");
      expect(email.text).toContain("92%");
    });

    it("has empty to field for caller to fill in", () => {
      const email = budgetAlertEmail("Deal", 50);
      expect(email.to).toBe("");
    });
  });

  describe("milestoneOverdueEmail", () => {
    it("returns correct subject with milestone and deal name", () => {
      const email = milestoneOverdueEmail("Foundation", "Villa Flip", "2026-01-15");
      expect(email.subject).toBe("Overdue: Foundation on Villa Flip");
    });

    it("contains milestone name, deal name, and due date in html", () => {
      const email = milestoneOverdueEmail("Roof Complete", "Beach House", "2026-03-01");
      expect(email.html).toContain("Roof Complete");
      expect(email.html).toContain("Beach House");
      expect(email.html).toContain("2026-03-01");
    });

    it("contains milestone name, deal name, and due date in text", () => {
      const email = milestoneOverdueEmail("Roof Complete", "Beach House", "2026-03-01");
      expect(email.text).toContain("Roof Complete");
      expect(email.text).toContain("Beach House");
      expect(email.text).toContain("2026-03-01");
    });
  });

  describe("expenseApprovalEmail", () => {
    it("returns correct subject with amount and deal name", () => {
      const email = expenseApprovalEmail("Plumbing repair", 15000, "Main Street Flip");
      expect(email.subject).toContain("R15");
      expect(email.subject).toContain("Main Street Flip");
    });

    it("contains expense details in html", () => {
      const email = expenseApprovalEmail("Electrical work", 25000, "Oak Avenue");
      expect(email.html).toContain("Electrical work");
      expect(email.html).toContain("Oak Avenue");
    });

    it("contains expense details in text", () => {
      const email = expenseApprovalEmail("Tiling", 8000, "Corner House");
      expect(email.text).toContain("Tiling");
      expect(email.text).toContain("Corner House");
    });
  });

  describe("poApprovalEmail", () => {
    it("returns correct subject with PO number and total", () => {
      const email = poApprovalEmail("PO-001", 50000, "Builder Supplies");
      expect(email.subject).toContain("PO-001");
      expect(email.subject).toContain("R50");
    });

    it("contains supplier name in html", () => {
      const email = poApprovalEmail("PO-002", 30000, "Tile World");
      expect(email.html).toContain("Tile World");
      expect(email.html).toContain("PO-002");
    });

    it("falls back to 'supplier' when supplier name is empty", () => {
      const email = poApprovalEmail("PO-003", 10000, "");
      expect(email.html).toContain("supplier");
      expect(email.text).toContain("supplier");
    });
  });
});

describe("sendEmail", () => {
  beforeEach(() => {
    vi.stubEnv("EMAIL_PROVIDER", "log");
  });

  it("returns success with dev messageId when using log provider", async () => {
    const result = await sendEmail({
      to: "test@example.com",
      subject: "Test",
      html: "<p>Hello</p>",
    });
    expect(result.success).toBe(true);
    expect(result.messageId).toBeDefined();
    expect(result.messageId!.startsWith("dev-")).toBe(true);
  });

  it("defaults to log provider when EMAIL_PROVIDER is not set", async () => {
    vi.stubEnv("EMAIL_PROVIDER", "");
    const result = await sendEmail({
      to: "test@example.com",
      subject: "Test",
      html: "<p>Hello</p>",
    });
    expect(result.success).toBe(true);
  });

  it("returns error for smtp provider (not implemented)", async () => {
    vi.stubEnv("EMAIL_PROVIDER", "smtp");
    const result = await sendEmail({
      to: "test@example.com",
      subject: "Test",
      html: "<p>Hello</p>",
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain("SMTP");
  });

  it("returns error for resend provider without API key", async () => {
    vi.stubEnv("EMAIL_PROVIDER", "resend");
    vi.stubEnv("RESEND_API_KEY", "");
    const result = await sendEmail({
      to: "test@example.com",
      subject: "Test",
      html: "<p>Hello</p>",
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain("RESEND_API_KEY");
  });
});
