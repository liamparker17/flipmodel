import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { generateNotifications } from "../notifications";
import type { Deal } from "../../types/deal";
import type { Tool, ToolCheckout } from "../../types/tool";

function makeDeal(overrides: Partial<Deal> = {}): Deal {
  return {
    id: "deal-1",
    name: "Test Property",
    address: "123 Main St",
    purchasePrice: 500000,
    expectedSalePrice: 700000,
    stage: "renovating",
    priority: "medium",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    notes: "",
    tags: [],
    data: {
      mode: "quick",
      acq: {
        purchasePrice: 500000,
        deposit: 50000,
        bondRate: 11.5,
        bondTerm: 240,
        cashPurchase: false,
        transferAttorneyFees: 0,
        bondRegistration: 0,
        initialRepairs: 0,
      },
      prop: {
        totalSqm: 100,
        erfSize: 500,
        bedrooms: 3,
        bathrooms: 2,
        garages: 1,
        stories: "1",
      },
      rooms: [],
      nextRoomId: 1,
      contractors: [],
      costDb: {},
      contingencyPct: 10,
      pmPct: 5,
      holding: {
        renovationMonths: 3,
        ratesAndTaxes: 500,
        utilities: 300,
        insurance: 200,
        security: 0,
        levies: 0,
      },
      resale: {
        expectedPrice: 700000,
        areaBenchmarkPsqm: 7000,
        agentCommission: 5,
      },
      quickRenoEstimate: 100000,
    },
    expenses: [],
    milestones: [],
    activities: [],
    contacts: [],
    documents: [],
    ...overrides,
  };
}

function makeTool(overrides: Partial<Tool> = {}): Tool {
  return {
    id: "tool-1",
    name: "Bosch Drill",
    category: "drill",
    purchaseDate: "2024-01-01",
    purchaseCost: 1800,
    expectedLifespanMonths: 36,
    replacementCost: 1800,
    status: "checked_out",
    condition: "good",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeCheckout(overrides: Partial<ToolCheckout> = {}): ToolCheckout {
  return {
    id: "co-1",
    toolId: "tool-1",
    contractorName: "John Builder",
    checkedOutAt: "2024-06-01T08:00:00Z",
    conditionOut: "good",
    ...overrides,
  };
}

describe("generateNotifications", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Fix "now" to 2025-06-15 12:00 UTC so date math is deterministic
    vi.setSystemTime(new Date("2025-06-15T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns empty array when no data", () => {
    const result = generateNotifications([], [], []);
    expect(result).toEqual([]);
  });

  it("generates deadline_warning for milestones due within 3 days", () => {
    const deal = makeDeal({
      milestones: [
        {
          id: "m-1",
          title: "Plumbing Rough-In",
          description: "",
          dueDate: "2025-06-17T00:00:00Z", // 2 days from now
          status: "in_progress",
          tasks: [],
          order: 1,
        },
      ],
    });

    const result = generateNotifications([deal], [], []);
    const warnings = result.filter((n) => n.type === "deadline_warning");

    expect(warnings).toHaveLength(1);
    expect(warnings[0].title).toBe("Milestone Due Soon");
    expect(warnings[0].message).toContain("Plumbing Rough-In");
    expect(warnings[0].metadata?.dealId).toBe("deal-1");
    expect(warnings[0].metadata?.milestoneId).toBe("m-1");
  });

  it("generates milestone_overdue for past-due milestones", () => {
    const deal = makeDeal({
      milestones: [
        {
          id: "m-2",
          title: "Electrical Sign-off",
          description: "",
          dueDate: "2025-06-10T00:00:00Z", // 5 days ago
          status: "in_progress",
          tasks: [],
          order: 1,
        },
      ],
    });

    const result = generateNotifications([deal], [], []);
    const overdue = result.filter((n) => n.type === "milestone_overdue");

    expect(overdue).toHaveLength(1);
    expect(overdue[0].title).toBe("Milestone Overdue");
    expect(overdue[0].message).toContain("Electrical Sign-off");
    expect(overdue[0].metadata?.dealId).toBe("deal-1");
  });

  it("generates budget_alert when expenses exceed 80% of budget", () => {
    const deal = makeDeal({
      expenses: [
        {
          id: "e-1",
          dealId: "deal-1",
          category: "materials",
          description: "Tiles",
          amount: 85000, // 85% of 100,000 budget
          date: "2025-06-01",
          vendor: "Builders Warehouse",
          paymentMethod: "eft",
          isProjected: false,
          createdAt: new Date().toISOString(),
        },
      ],
    });

    const result = generateNotifications([deal], [], []);
    const budgetAlerts = result.filter((n) => n.type === "budget_alert");

    expect(budgetAlerts).toHaveLength(1);
    expect(budgetAlerts[0].title).toBe("Budget Warning");
    expect(budgetAlerts[0].message).toContain("85%");
    expect(budgetAlerts[0].metadata?.dealId).toBe("deal-1");
  });

  it("does NOT count projected expenses towards budget alerts", () => {
    const deal = makeDeal({
      expenses: [
        {
          id: "e-1",
          dealId: "deal-1",
          category: "materials",
          description: "Projected tiles",
          amount: 95000,
          date: "2025-06-01",
          vendor: "Projected",
          paymentMethod: "eft",
          isProjected: true,
          createdAt: new Date().toISOString(),
        },
      ],
    });

    const result = generateNotifications([deal], [], []);
    const budgetAlerts = result.filter((n) => n.type === "budget_alert");

    expect(budgetAlerts).toHaveLength(0);
  });

  it("generates tool_overdue for unreturned tools past expected return date", () => {
    const tool = makeTool({ id: "tool-1", name: "Bosch Drill" });
    const checkout = makeCheckout({
      toolId: "tool-1",
      contractorName: "John Builder",
      expectedReturnDate: "2025-06-10T00:00:00Z", // 5 days ago
      returnedAt: undefined,
    });

    const result = generateNotifications([], [tool], [checkout]);
    const toolOverdue = result.filter((n) => n.type === "tool_overdue");

    expect(toolOverdue).toHaveLength(1);
    expect(toolOverdue[0].title).toBe("Tool Return Overdue");
    expect(toolOverdue[0].message).toContain("Bosch Drill");
    expect(toolOverdue[0].message).toContain("John Builder");
    expect(toolOverdue[0].metadata?.toolId).toBe("tool-1");
    expect(toolOverdue[0].metadata?.checkoutId).toBe("co-1");
  });

  it("does NOT generate alerts for completed milestones", () => {
    const deal = makeDeal({
      milestones: [
        {
          id: "m-3",
          title: "Completed Task",
          description: "",
          dueDate: "2025-06-10T00:00:00Z",
          status: "completed",
          tasks: [],
          order: 1,
        },
      ],
    });

    const result = generateNotifications([deal], [], []);
    expect(result.filter((n) => n.type === "milestone_overdue")).toHaveLength(0);
    expect(result.filter((n) => n.type === "deadline_warning")).toHaveLength(0);
  });

  it("does NOT generate alerts for skipped milestones", () => {
    const deal = makeDeal({
      milestones: [
        {
          id: "m-4",
          title: "Skipped Task",
          description: "",
          dueDate: "2025-06-10T00:00:00Z",
          status: "skipped",
          tasks: [],
          order: 1,
        },
      ],
    });

    const result = generateNotifications([deal], [], []);
    expect(result).toHaveLength(0);
  });

  it("does NOT generate alerts for returned tools", () => {
    const tool = makeTool();
    const checkout = makeCheckout({
      expectedReturnDate: "2025-06-10T00:00:00Z",
      returnedAt: "2025-06-11T00:00:00Z",
    });

    const result = generateNotifications([], [tool], [checkout]);
    const toolOverdue = result.filter((n) => n.type === "tool_overdue");

    expect(toolOverdue).toHaveLength(0);
  });

  it("does NOT generate budget_alert when budget is zero", () => {
    const deal = makeDeal({
      data: {
        ...makeDeal().data,
        quickRenoEstimate: 0,
      },
      expenses: [
        {
          id: "e-1",
          dealId: "deal-1",
          category: "materials",
          description: "Tiles",
          amount: 50000,
          date: "2025-06-01",
          vendor: "Test",
          paymentMethod: "eft",
          isProjected: false,
          createdAt: new Date().toISOString(),
        },
      ],
    });

    const result = generateNotifications([deal], [], []);
    const budgetAlerts = result.filter((n) => n.type === "budget_alert");

    expect(budgetAlerts).toHaveLength(0);
  });

  it("falls back to 'Tool' name when tool is not found in array", () => {
    const checkout = makeCheckout({
      toolId: "nonexistent-tool",
      expectedReturnDate: "2025-06-10T00:00:00Z",
      returnedAt: undefined,
    });

    const result = generateNotifications([], [], [checkout]);
    const toolOverdue = result.filter((n) => n.type === "tool_overdue");

    expect(toolOverdue).toHaveLength(1);
    expect(toolOverdue[0].message).toContain("Tool checked out");
  });

  it("handles multiple deals and checkouts together", () => {
    const deal1 = makeDeal({
      id: "deal-1",
      name: "Property A",
      milestones: [
        {
          id: "m-1",
          title: "Overdue task",
          description: "",
          dueDate: "2025-06-10T00:00:00Z",
          status: "in_progress",
          tasks: [],
          order: 1,
        },
      ],
    });
    const deal2 = makeDeal({
      id: "deal-2",
      name: "Property B",
      expenses: [
        {
          id: "e-1",
          dealId: "deal-2",
          category: "labour",
          description: "Contractor",
          amount: 90000,
          date: "2025-06-01",
          vendor: "Builder",
          paymentMethod: "eft",
          isProjected: false,
          createdAt: new Date().toISOString(),
        },
      ],
    });
    const tool = makeTool({ id: "tool-2", name: "Saw" });
    const checkout = makeCheckout({
      toolId: "tool-2",
      expectedReturnDate: "2025-06-12T00:00:00Z",
      returnedAt: undefined,
    });

    const result = generateNotifications([deal1, deal2], [tool], [checkout]);

    expect(result.filter((n) => n.type === "milestone_overdue")).toHaveLength(1);
    expect(result.filter((n) => n.type === "budget_alert")).toHaveLength(1);
    expect(result.filter((n) => n.type === "tool_overdue")).toHaveLength(1);
    expect(result.length).toBeGreaterThanOrEqual(3);
  });
});
