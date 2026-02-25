import { describe, it, expect } from "vitest";
import { computeMetrics, calcScenario } from "../calculations";

// Minimal costDb for testing
const emptyCostDb = {} as any;

// A costDb with one item per unit type for predictable results
const testCostDb = {
  painting: {
    wallPaint: { cost: 100, unit: "sqm" },
    edging: { cost: 50, unit: "lm" },
    plugs: { cost: 200, unit: "point" },
    prep: { cost: 500, unit: "room" },
    permit: { cost: 1000, unit: "fixed" },
  },
} as any;

function makeProfile(overrides: Record<string, any> = {}) {
  return {
    acq: {
      purchasePrice: 1000000,
      deposit: 100000,
      bondRate: 12,
      bondTerm: 240,
      cashPurchase: false,
      transferAttorneyFees: 45000,
      bondRegistration: 25000,
      initialRepairs: 0,
      ...overrides.acq,
    },
    prop: {
      totalSqm: 100,
      erfSize: 500,
      ...overrides.prop,
    },
    rooms: overrides.rooms ?? [],
    contractors: overrides.contractors ?? [],
    costDb: overrides.costDb ?? emptyCostDb,
    contingencyPct: overrides.contingencyPct ?? 10,
    pmPct: overrides.pmPct ?? 8,
    holding: {
      renovationMonths: 4,
      ratesAndTaxes: 1800,
      utilities: 1200,
      insurance: 950,
      security: 2500,
      levies: 0,
      ...overrides.holding,
    },
    resale: {
      expectedPrice: 1800000,
      agentCommission: 5,
      areaBenchmarkPsqm: 18000,
      ...overrides.resale,
    },
    quickRenoEstimate: overrides.quickRenoEstimate ?? 200000,
    mode: overrides.mode ?? "quick",
  };
}

describe("computeMetrics", () => {
  it("computes basic metrics for a quick-mode profile", () => {
    const result = computeMetrics(makeProfile());

    // Transfer duty for R1,000,000 is R0 (below R1,100,000 threshold)
    expect(result.transferDuty).toBe(0);

    // totalAcquisition = purchasePrice + transferDuty + transferAttorneyFees + bondRegistration + initialRepairs
    expect(result.totalAcquisition).toBe(1000000 + 0 + 45000 + 25000 + 0);

    // In quick mode, totalRenovation = quickRenoEstimate
    expect(result.totalRenovation).toBe(200000);
  });

  it("computes transfer duty correctly for price above thresholds", () => {
    const result = computeMetrics(
      makeProfile({ acq: { purchasePrice: 1500000 } })
    );
    // 1,500,000 is in the (1,100,000 - 1,512,500) bracket
    // transferDuty = (1,500,000 - 1,100,000) * 0.03 = 12,000
    expect(result.transferDuty).toBe(12000);
  });

  it("computes holding costs based on monthly totals and months", () => {
    const result = computeMetrics(makeProfile());

    // monthlyBondInterest = (1,000,000 - 100,000) * (12/100) / 12 = 9,000
    expect(result.monthlyBondInterest).toBe(9000);

    // monthlyHoldingTotal = 9000 + 1800 + 1200 + 950 + 2500 + 0 = 15,450
    expect(result.monthlyHoldingTotal).toBe(15450);

    // totalHoldingCost = 15,450 * 4 = 61,800
    expect(result.totalHoldingCost).toBe(61800);
  });

  it("sets monthlyBondInterest to 0 for cash purchase", () => {
    const result = computeMetrics(
      makeProfile({ acq: { cashPurchase: true } })
    );
    expect(result.monthlyBondInterest).toBe(0);
  });

  it("computes profit and ROI", () => {
    const result = computeMetrics(makeProfile());

    // allInCost = totalAcquisition + totalRenovation + totalHoldingCost
    const expectedAllIn = 1070000 + 200000 + 61800;
    expect(result.allInCost).toBe(expectedAllIn);

    // agentComm = 1,800,000 * 0.05 = 90,000
    expect(result.agentComm).toBe(90000);

    // grossProfit = 1,800,000 - allInCost
    expect(result.grossProfit).toBe(1800000 - expectedAllIn);

    // netProfit = grossProfit - agentComm
    expect(result.netProfit).toBe(1800000 - expectedAllIn - 90000);

    // roi = netProfit / allInCost
    expect(result.roi).toBeCloseTo(result.netProfit / expectedAllIn, 6);
  });

  it("handles zero totalSqm gracefully", () => {
    const result = computeMetrics(makeProfile({ prop: { totalSqm: 0 } }));
    expect(result.renoCostPerSqm).toBe(0);
    expect(result.profitPerSqm).toBe(0);
  });

  it("handles zero allInCost gracefully", () => {
    const result = computeMetrics(
      makeProfile({
        acq: {
          purchasePrice: 0,
          deposit: 0,
          bondRate: 0,
          bondTerm: 0,
          cashPurchase: true,
          transferAttorneyFees: 0,
          bondRegistration: 0,
          initialRepairs: 0,
        },
        quickRenoEstimate: 0,
        holding: {
          renovationMonths: 0,
          ratesAndTaxes: 0,
          utilities: 0,
          insurance: 0,
          security: 0,
          levies: 0,
        },
      })
    );
    expect(result.roi).toBe(0);
    expect(result.annualizedRoi).toBe(0);
  });

  it("uses advanced renovation calculation when mode is advanced", () => {
    const room = {
      customCost: 50000,
      breakdownMode: "simple",
      detailedItems: null,
      scope: "fullGut",
      sqm: 20,
      name: "Bathroom",
      id: 1,
    };

    const result = computeMetrics(
      makeProfile({
        mode: "advanced",
        rooms: [room],
        costDb: emptyCostDb,
        contractors: [{ dailyRate: 500, daysWorked: 10 }],
        contingencyPct: 10,
        pmPct: 10,
      })
    );

    // baseCosts = roomMaterialCost (50000) + contractorLabour (5000) + fixedCosts (0) = 55000
    // pmCost = 55000 * 0.10 = 5500
    // contingency = (55000 + 5500) * 0.10 = 6050
    // totalRenovation = 55000 + 5500 + 6050 = 66550
    expect(result.totalRenovation).toBe(66550);
    expect(result.contractorLabour).toBe(5000);
  });

  it("calculates room cost from detailed items", () => {
    const room = {
      customCost: null,
      breakdownMode: "detailed",
      detailedItems: [
        { included: true, qty: 10, unitCost: 100 },
        { included: true, qty: 5, unitCost: 50 },
        { included: false, qty: 100, unitCost: 100 }, // excluded
      ],
      scope: "fullGut",
      sqm: 20,
      name: "Kitchen",
      id: 2,
    };

    const result = computeMetrics(
      makeProfile({
        mode: "advanced",
        rooms: [room],
        costDb: emptyCostDb,
      })
    );

    // detailedItems: 10*100 + 5*50 = 1250 (excluded item ignored)
    expect(result.totalRoomMaterialCost).toBe(1250);
  });

  it("calculates room cost from costDb with scope multiplier", () => {
    const room = {
      customCost: null,
      breakdownMode: "simple",
      detailedItems: null,
      scope: "cosmetic", // multiplier 0.25
      sqm: 16, // sqrt(16) = 4, perimeter = 16
      name: "Bedroom",
      id: 3,
    };

    const result = computeMetrics(
      makeProfile({
        mode: "advanced",
        rooms: [room],
        costDb: testCostDb,
      })
    );

    // sqm item: 100 * 16 * 0.25 = 400
    // lm item: 50 * 16 * 0.25 = 200  (perimeter = 4 * sqrt(16) = 16)
    // point item: 200 * ceil(16/4) * 0.25 = 200 * 4 * 0.25 = 200
    // room item: 500 * 0.25 = 125
    // fixed items are NOT counted per-room (they're counted separately)
    // total room cost = round(400 + 200 + 200 + 125) = 925
    expect(result.totalRoomMaterialCost).toBe(925);

    // Fixed costs are summed separately
    expect(result.fixedCosts).toBe(1000);
  });

  it("returns a deal score object", () => {
    const result = computeMetrics(makeProfile());
    expect(result.dealScore).toBeDefined();
    expect(result.dealScore.level).toBeDefined();
    expect(result.dealScore.label).toBeDefined();
    expect(result.dealScore.color).toBeDefined();
  });
});

describe("calcScenario", () => {
  const baseInputs = {
    renovationMonths: 4,
    totalRenovation: 200000,
    monthlyHoldingTotal: 15000,
    totalAcquisition: 1100000,
    expectedPrice: 1800000,
    agentCommission: 5,
  };

  it("returns base values when no scenario adjustments", () => {
    const result = calcScenario(baseInputs, {});

    // totalHoldMonths = 4 + 0 + 0 = 4
    expect(result.totalHoldMonths).toBe(4);

    // adjReno = 200000 * 1.0 = 200000
    expect(result.adjReno).toBe(200000);

    // adjHold = 15000 * 4 = 60000
    expect(result.adjHold).toBe(60000);

    // allIn = 1100000 + 200000 + 60000 = 1360000
    expect(result.allIn).toBe(1360000);

    // resalePrice = 1800000
    expect(result.resalePrice).toBe(1800000);

    // commission = 1800000 * 0.05 = 90000
    // netProfit = 1800000 - 1360000 - 90000 = 350000
    expect(result.netProfit).toBe(350000);
  });

  it("applies resale adjustment percentage", () => {
    const result = calcScenario(baseInputs, { resaleAdjPct: -10 });
    // adjResale = 1800000 * 0.90 = 1620000
    expect(result.resalePrice).toBe(1620000);
  });

  it("applies renovation cost adjustment", () => {
    const result = calcScenario(baseInputs, { renoAdjPct: 20 });
    // adjReno = 200000 * 1.20 = 240000
    expect(result.adjReno).toBe(240000);
  });

  it("applies construction and transfer delay months", () => {
    const result = calcScenario(baseInputs, {
      constructionDelayMonths: 2,
      transferDelayMonths: 1,
    });
    // totalHoldMonths = 4 + 2 + 1 = 7
    expect(result.totalHoldMonths).toBe(7);
    // adjHold = 15000 * 7 = 105000
    expect(result.adjHold).toBe(105000);
  });

  it("calculates ROI and annualized ROI", () => {
    const result = calcScenario(baseInputs, {});
    expect(result.roi).toBeCloseTo(result.netProfit / result.allIn, 6);
    expect(result.annRoi).toBeCloseTo(
      (result.netProfit / result.allIn) * (12 / result.totalHoldMonths),
      6
    );
  });

  it("returns deal score with level and color", () => {
    const result = calcScenario(baseInputs, {});
    expect(result.dealScore).toBeDefined();
    expect(result.dealScore.level).toBeDefined();
    expect(result.dealScore.color).toBeDefined();
  });

  it("handles zero allIn cost gracefully (no division by zero)", () => {
    const result = calcScenario(
      {
        renovationMonths: 0,
        totalRenovation: 0,
        monthlyHoldingTotal: 0,
        totalAcquisition: 0,
        expectedPrice: 0,
        agentCommission: 0,
      },
      {}
    );
    expect(result.roi).toBe(0);
    expect(result.annRoi).toBe(0);
  });

  it("returns risky score for negative net profit", () => {
    const result = calcScenario(baseInputs, {
      resaleAdjPct: -50,
      renoAdjPct: 50,
      constructionDelayMonths: 6,
    });
    expect(result.netProfit).toBeLessThan(0);
    expect(result.dealScore.level).toBe("risky");
  });
});
