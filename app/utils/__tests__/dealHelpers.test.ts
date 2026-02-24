import { describe, it, expect, vi } from "vitest";

// Mock the theme module so we don't pull in React dependencies
vi.mock("../../components/theme", () => ({
  calcTransferDuty: (price: number): number => {
    // SA transfer duty brackets (same logic as production)
    if (price <= 1100000) return 0;
    if (price <= 1512500) return (price - 1100000) * 0.03;
    if (price <= 2117500) return 12375 + (price - 1512500) * 0.06;
    if (price <= 2722500) return 48675 + (price - 2117500) * 0.08;
    if (price <= 12100000) return 97075 + (price - 2722500) * 0.11;
    return 1128600 + (price - 12100000) * 0.13;
  },
}));

import { computeDealMetrics, getStageColor, getStageLabel, getStageIndex, groupDealsByStage, DEAL_STAGES } from "../dealHelpers";
import type { Deal } from "../../types/deal";

function makeDeal(overrides: Partial<Deal> = {}): Deal {
  return {
    id: "deal-1",
    name: "Test Property",
    address: "123 Test St",
    purchasePrice: 1000000,
    expectedSalePrice: 1500000,
    stage: "purchased",
    priority: "medium",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    notes: "",
    tags: [],
    data: {
      mode: "quick",
      acq: {
        purchasePrice: 1000000,
        deposit: 0,
        bondRate: 0,
        bondTerm: 20,
        cashPurchase: true,
        transferAttorneyFees: 0,
        bondRegistration: 0,
        initialRepairs: 0,
      },
      prop: { totalSqm: 100, erfSize: 500, bedrooms: 3, bathrooms: 2, garages: 1, stories: "1" },
      rooms: [],
      nextRoomId: 1,
      contractors: [],
      costDb: {},
      contingencyPct: 10,
      pmPct: 8,
      holding: {
        renovationMonths: 4,
        ratesAndTaxes: 0,
        utilities: 0,
        insurance: 0,
        security: 0,
        levies: 0,
      },
      resale: {
        expectedPrice: 1500000,
        areaBenchmarkPsqm: 15000,
        agentCommission: 5,
      },
      quickRenoEstimate: 0,
    },
    expenses: [],
    milestones: [],
    activities: [],
    contacts: [],
    documents: [],
    ...overrides,
  };
}

describe("computeDealMetrics", () => {
  it("computes basic metrics with purchase and expected sale price", () => {
    const deal = makeDeal();
    const metrics = computeDealMetrics(deal);

    expect(metrics.purchasePrice).toBe(1000000);
    expect(metrics.expectedPrice).toBe(1500000);
    expect(metrics.renovationMonths).toBe(4);
    // Resale costs = 1500000 * 5% = 75000
    expect(metrics.totalResaleCosts).toBe(75000);
    // No reno costs in quick mode with 0 estimate
    expect(metrics.totalRenovationCosts).toBe(0);
    // Profit = 1500000 - 1000000 - acqCosts - 0 holding - 0 reno - 75000 resale
    // Transfer duty at 1000000 = 0 (below threshold)
    expect(metrics.totalAcquisitionCosts).toBe(0);
    expect(metrics.estimatedProfit).toBe(1500000 - 1000000 - 75000);
  });

  it("correctly includes acquisition costs", () => {
    const deal = makeDeal({
      data: {
        ...makeDeal().data,
        acq: {
          purchasePrice: 2000000,
          deposit: 200000,
          bondRate: 12,
          bondTerm: 20,
          cashPurchase: true,
          transferAttorneyFees: 25000,
          bondRegistration: 15000,
          initialRepairs: 0,
        },
      },
    });

    const metrics = computeDealMetrics(deal);

    // Transfer duty at 2000000 = 12375 + (2000000 - 1512500) * 0.06 = 12375 + 29250 = 41625
    const expectedTransferDuty = 12375 + (2000000 - 1512500) * 0.06;
    const expectedAcqCosts = expectedTransferDuty + 15000 + 25000;
    expect(metrics.totalAcquisitionCosts).toBeCloseTo(expectedAcqCosts, 2);
  });

  it("correctly includes holding costs with bond interest", () => {
    const deal = makeDeal({
      data: {
        ...makeDeal().data,
        acq: {
          purchasePrice: 1000000,
          deposit: 100000,
          bondRate: 12,
          bondTerm: 20,
          cashPurchase: false, // bond purchase to trigger interest calc
          transferAttorneyFees: 0,
          bondRegistration: 0,
          initialRepairs: 0,
        },
        holding: {
          renovationMonths: 6,
          ratesAndTaxes: 1500,
          utilities: 800,
          insurance: 500,
          security: 300,
          levies: 200,
        },
      },
    });

    const metrics = computeDealMetrics(deal);

    // Bond interest: (1000000 - 100000) * (12/100) / 12 = 900000 * 0.01 = 9000/month
    const monthlyBondInterest = (900000 * (12 / 100)) / 12;
    expect(monthlyBondInterest).toBe(9000);
    const monthlyHolding = 1500 + 800 + 500 + 300 + 200 + monthlyBondInterest;
    const totalHolding = monthlyHolding * 6;
    expect(metrics.totalHoldingCosts).toBeCloseTo(totalHolding, 2);
    expect(metrics.renovationMonths).toBe(6);
  });

  it("correctly calculates ROI and annualized ROI", () => {
    const deal = makeDeal({
      data: {
        ...makeDeal().data,
        acq: {
          purchasePrice: 1000000,
          deposit: 0,
          bondRate: 0,
          bondTerm: 20,
          cashPurchase: true,
          transferAttorneyFees: 0,
          bondRegistration: 0,
          initialRepairs: 0,
        },
        holding: {
          renovationMonths: 6,
          ratesAndTaxes: 0,
          utilities: 0,
          insurance: 0,
          security: 0,
          levies: 0,
        },
        resale: {
          expectedPrice: 1500000,
          areaBenchmarkPsqm: 15000,
          agentCommission: 5,
        },
        quickRenoEstimate: 200000,
      },
    });

    const metrics = computeDealMetrics(deal);

    // totalInvested = 1000000 + 0 acq + 0 holding + 200000 reno = 1200000
    expect(metrics.totalInvested).toBe(1200000);
    // resaleCosts = 1500000 * 5% = 75000
    // profit = 1500000 - 1000000 - 0 - 0 - 200000 - 75000 = 225000
    expect(metrics.estimatedProfit).toBe(225000);
    // ROI = 225000 / 1200000 = 0.1875
    expect(metrics.estimatedRoi).toBeCloseTo(0.1875, 4);
    // Annualized ROI = 0.1875 / (6/12) = 0.375
    expect(metrics.annualizedRoi).toBeCloseTo(0.375, 4);
  });

  it("handles null/missing deal data gracefully", () => {
    const deal = makeDeal({ data: undefined as unknown as Deal["data"] });
    const metrics = computeDealMetrics(deal);

    expect(metrics.purchasePrice).toBe(0);
    expect(metrics.expectedPrice).toBe(0);
    expect(metrics.estimatedProfit).toBe(0);
    expect(metrics.estimatedRoi).toBe(0);
    expect(metrics.annualizedRoi).toBe(0);
    expect(metrics.totalAcquisitionCosts).toBe(0);
    expect(metrics.totalHoldingCosts).toBe(0);
    expect(metrics.totalRenovationCosts).toBe(0);
    expect(metrics.totalResaleCosts).toBe(0);
    expect(metrics.totalInvested).toBe(0);
  });

  it("handles zero purchase price without dividing by zero", () => {
    const deal = makeDeal({
      data: {
        ...makeDeal().data,
        acq: {
          ...makeDeal().data.acq,
          purchasePrice: 0,
        },
        resale: {
          expectedPrice: 0,
          areaBenchmarkPsqm: 0,
          agentCommission: 5,
        },
        quickRenoEstimate: 0,
      },
    });

    const metrics = computeDealMetrics(deal);

    expect(metrics.estimatedRoi).toBe(0);
    expect(metrics.annualizedRoi).toBe(0);
    expect(Number.isFinite(metrics.estimatedRoi)).toBe(true);
    expect(Number.isFinite(metrics.annualizedRoi)).toBe(true);
  });
});

describe("getStageColor", () => {
  it("returns the correct color for a known stage", () => {
    expect(getStageColor("lead")).toBe("#94A3B8");
    expect(getStageColor("sold")).toBe("#22D3EE");
  });

  it("returns default color for an unknown stage", () => {
    expect(getStageColor("nonexistent")).toBe("#94A3B8");
  });
});

describe("getStageLabel", () => {
  it("returns the label for known stages", () => {
    expect(getStageLabel("offer_made")).toBe("Offer Made");
  });

  it("returns the key itself for unknown stages", () => {
    expect(getStageLabel("unknown_stage")).toBe("unknown_stage");
  });
});

describe("getStageIndex", () => {
  it("returns correct index for each stage", () => {
    expect(getStageIndex("lead")).toBe(0);
    expect(getStageIndex("sold")).toBe(6);
  });

  it("returns -1 for unknown stages", () => {
    expect(getStageIndex("fake")).toBe(-1);
  });
});

describe("groupDealsByStage", () => {
  it("groups deals into the correct stage buckets", () => {
    const deals = [
      makeDeal({ id: "1", stage: "lead" }),
      makeDeal({ id: "2", stage: "lead" }),
      makeDeal({ id: "3", stage: "sold" }),
    ];

    const grouped = groupDealsByStage(deals);

    expect(grouped.lead).toHaveLength(2);
    expect(grouped.sold).toHaveLength(1);
    expect(grouped.purchased).toHaveLength(0);
  });

  it("returns empty arrays when no deals provided", () => {
    const grouped = groupDealsByStage([]);
    for (const stage of DEAL_STAGES) {
      expect(grouped[stage.key]).toHaveLength(0);
    }
  });
});
