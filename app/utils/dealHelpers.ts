// ─── Deal Pipeline Helpers ───
import type { Deal, DealStage, DealData, DealMetrics, StageDefinition, Expense } from "../types/deal";
import { calcTransferDuty } from "../components/theme";

export const DEAL_STAGES: StageDefinition[] = [
  { key: "lead", label: "Lead", color: "#94A3B8" },
  { key: "analysing", label: "Analysing", color: "#60A5FA" },
  { key: "offer_made", label: "Offer Made", color: "#C084FC" },
  { key: "purchased", label: "Purchased", color: "#34D399" },
  { key: "renovating", label: "Renovating", color: "#FB923C" },
  { key: "listed", label: "Listed", color: "#F472B6" },
  { key: "sold", label: "Sold", color: "#22D3EE" },
];

export const PRIORITY_CONFIG = {
  low: { label: "Low", color: "#94A3B8", icon: "↓" },
  medium: { label: "Medium", color: "#60A5FA", icon: "→" },
  high: { label: "High", color: "#FB923C", icon: "↑" },
  urgent: { label: "Urgent", color: "#EF4444", icon: "!!" },
} as const;

export const EXPENSE_CATEGORIES = {
  materials: { label: "Materials", color: "#60A5FA" },
  labour: { label: "Labour", color: "#FB923C" },
  permits: { label: "Permits & Approvals", color: "#C084FC" },
  legal: { label: "Legal & Transfer", color: "#94A3B8" },
  utilities: { label: "Utilities", color: "#22D3EE" },
  transport: { label: "Transport", color: "#F472B6" },
  equipment: { label: "Equipment Hire", color: "#A78BFA" },
  marketing: { label: "Marketing & Staging", color: "#34D399" },
  professional_fees: { label: "Professional Fees", color: "#FBBF24" },
  insurance: { label: "Insurance", color: "#6366F1" },
  rates_taxes: { label: "Rates & Taxes", color: "#EC4899" },
  contingency: { label: "Contingency", color: "#EF4444" },
  other: { label: "Other", color: "#6B7280" },
} as const;

export function getStageColor(stageKey: string): string {
  const stage = DEAL_STAGES.find((s) => s.key === stageKey);
  return stage ? stage.color : "#94A3B8";
}

export function getStageLabel(stageKey: string): string {
  const stage = DEAL_STAGES.find((s) => s.key === stageKey);
  return stage ? stage.label : stageKey;
}

export function getStageIndex(stageKey: string): number {
  return DEAL_STAGES.findIndex((s) => s.key === stageKey);
}

export function groupDealsByStage(deals: Deal[]): Record<DealStage, Deal[]> {
  const groups: Record<DealStage, Deal[]> = {
    lead: [],
    analysing: [],
    offer_made: [],
    purchased: [],
    renovating: [],
    listed: [],
    sold: [],
  };
  for (const deal of deals) {
    if (groups[deal.stage]) {
      groups[deal.stage].push(deal);
    } else {
      groups.lead.push(deal);
    }
  }
  return groups;
}

export function computeDealMetrics(deal: Deal): DealMetrics {
  const dealData = deal.data;
  if (!dealData) return {
    purchasePrice: 0, expectedPrice: 0, renovationMonths: 4,
    estimatedProfit: 0, estimatedRoi: 0, annualizedRoi: 0,
    totalAcquisitionCosts: 0, totalHoldingCosts: 0, totalRenovationCosts: 0, totalResaleCosts: 0,
    totalInvested: 0,
  };

  const { acq, holding, resale, rooms, mode, quickRenoEstimate } = dealData;
  const purchasePrice = acq?.purchasePrice || 0;
  const expectedPrice = resale?.expectedPrice || 0;
  const renovationMonths = holding?.renovationMonths || 4;

  // ─── Acquisition costs ───
  const transferDuty = calcTransferDuty(purchasePrice);
  const bondRegistration = acq?.bondRegistration || 0;
  const attorneyFees = acq?.transferAttorneyFees || 0;
  const totalAcquisitionCosts = transferDuty + bondRegistration + attorneyFees;

  // ─── Holding costs ───
  const ratesAndTaxes = holding?.ratesAndTaxes || 0;
  const utilities = holding?.utilities || 0;
  const insurance = holding?.insurance || 0;
  const levies = holding?.levies || 0;
  const security = holding?.security || 0;
  // Bond interest: monthly = (purchasePrice - deposit) * (bondRate / 100) / 12
  let monthlyBondInterest = 0;
  if (acq && !acq.cashPurchase) {
    const bondAmount = purchasePrice - (acq.deposit || 0);
    const bondRate = acq.bondRate || 0;
    monthlyBondInterest = (bondAmount * (bondRate / 100)) / 12;
  }
  const monthlyHolding = ratesAndTaxes + utilities + insurance + levies + security + monthlyBondInterest;
  const totalHoldingCosts = monthlyHolding * renovationMonths;

  // ─── Renovation costs ───
  let totalRenovationCosts = 0;
  if (mode === "quick") {
    totalRenovationCosts = quickRenoEstimate || 0;
  } else {
    // Advanced mode: sum detailed room costs if available, otherwise fall back to quickRenoEstimate
    const roomSum = (rooms || []).reduce((sum, room) => {
      if (room.customCost !== null && room.customCost !== undefined) return sum + Number(room.customCost);
      if (room.breakdownMode === "detailed" && room.detailedItems) {
        return sum + room.detailedItems
          .filter((i) => i.included)
          .reduce((s, i) => s + i.qty * i.unitCost, 0);
      }
      // Fallback: simple mode uses sqm * scope multiplier (approximation without costDb)
      // Use a reasonable per-sqm default since we don't have costDb here
      const scopeMult = room.scope === "fullGut" ? 1.5 : room.scope === "midLevel" ? 1 : 0.6;
      return sum + (room.sqm || 0) * 3500 * scopeMult;
    }, 0);
    totalRenovationCosts = roomSum > 0 ? roomSum : (quickRenoEstimate || 0);
  }

  // ─── Resale costs ───
  const commissionPct = resale?.agentCommission || 5;
  const agentCommission = expectedPrice * (commissionPct / 100);
  const totalResaleCosts = agentCommission;

  // ─── Profit ───
  const estimatedProfit = expectedPrice - purchasePrice - totalAcquisitionCosts - totalHoldingCosts - totalRenovationCosts - totalResaleCosts;

  // ─── ROI ───
  const totalInvested = purchasePrice + totalAcquisitionCosts + totalHoldingCosts + totalRenovationCosts;
  const estimatedRoi = totalInvested > 0 ? estimatedProfit / totalInvested : 0;

  // ─── Annualized ROI ───
  const annualizedRoi = (renovationMonths > 0 && totalInvested > 0)
    ? estimatedRoi / (renovationMonths / 12)
    : 0;

  // ─── Expenses ───
  const totalExpenses = (deal.expenses || []).filter((e) => !e.isProjected).reduce((s, e) => s + e.amount, 0);
  const projectedExpenses = (deal.expenses || []).filter((e) => e.isProjected).reduce((s, e) => s + e.amount, 0);

  const daysInPipeline = Math.floor((Date.now() - new Date(deal.createdAt).getTime()) / (1000 * 60 * 60 * 24));

  return {
    purchasePrice,
    expectedPrice,
    renovationMonths,
    estimatedProfit,
    estimatedRoi,
    annualizedRoi,
    totalAcquisitionCosts,
    totalHoldingCosts,
    totalRenovationCosts,
    totalResaleCosts,
    totalInvested,
    totalExpenses,
    budgetVariance: totalExpenses + projectedExpenses - totalRenovationCosts,
    daysInPipeline,
  };
}

export function getDealProgress(deal: Deal): { completed: number; total: number; pct: number } {
  const milestones = deal.milestones || [];
  if (milestones.length === 0) return { completed: 0, total: 0, pct: 0 };
  const tasks = milestones.flatMap((m) => m.tasks);
  if (tasks.length === 0) {
    const completed = milestones.filter((m) => m.status === "completed").length;
    return { completed, total: milestones.length, pct: milestones.length > 0 ? (completed / milestones.length) * 100 : 0 };
  }
  const completed = tasks.filter((t) => t.completed).length;
  return { completed, total: tasks.length, pct: tasks.length > 0 ? (completed / tasks.length) * 100 : 0 };
}

export function getExpensesByCategory(expenses: Expense[]): { category: string; label: string; color: string; actual: number; projected: number; total: number }[] {
  const map: Record<string, { actual: number; projected: number }> = {};
  for (const e of expenses) {
    if (!map[e.category]) map[e.category] = { actual: 0, projected: 0 };
    if (e.isProjected) map[e.category].projected += e.amount;
    else map[e.category].actual += e.amount;
  }
  return Object.entries(map).map(([cat, vals]) => ({
    category: cat,
    label: EXPENSE_CATEGORIES[cat as keyof typeof EXPENSE_CATEGORIES]?.label || cat,
    color: EXPENSE_CATEGORIES[cat as keyof typeof EXPENSE_CATEGORIES]?.color || "#6B7280",
    actual: vals.actual,
    projected: vals.projected,
    total: vals.actual + vals.projected,
  })).sort((a, b) => b.total - a.total);
}

export function getMonthlyExpenses(expenses: Expense[]): { month: string; actual: number; projected: number }[] {
  const map: Record<string, { actual: number; projected: number }> = {};
  for (const e of expenses) {
    const month = e.date.slice(0, 7); // YYYY-MM
    if (!map[month]) map[month] = { actual: 0, projected: 0 };
    if (e.isProjected) map[month].projected += e.amount;
    else map[month].actual += e.amount;
  }
  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, vals]) => ({ month, ...vals }));
}

export function getPortfolioMetrics(deals: Deal[]) {
  const activeDeals = deals.filter((d) => d.stage !== "sold");
  const soldDeals = deals.filter((d) => d.stage === "sold");
  const renovatingDeals = deals.filter((d) => d.stage === "purchased" || d.stage === "renovating");

  let totalInvested = 0;
  let totalExpectedReturn = 0;
  let totalActualReturn = 0;
  let totalProjectedProfit = 0;
  let totalActualProfit = 0;
  let totalRoi = 0;
  let totalAnnualizedRoi = 0;
  let roiCount = 0;
  let totalDays = 0;
  let daysCount = 0;

  for (const deal of deals) {
    const m = computeDealMetrics(deal);
    totalInvested += m.totalInvested;
    totalExpectedReturn += m.expectedPrice;
    totalProjectedProfit += m.estimatedProfit;
    if (m.estimatedRoi !== 0) {
      totalRoi += m.estimatedRoi;
      totalAnnualizedRoi += m.annualizedRoi;
      roiCount++;
    }
    if (m.daysInPipeline) { totalDays += m.daysInPipeline; daysCount++; }
  }

  // Sold deals: compute actual profit using the same comprehensive formula
  for (const deal of soldDeals) {
    const sp = deal.actualSalePrice || deal.expectedSalePrice;
    const pp = deal.purchasePrice;
    const dealData = deal.data;

    // Acquisition costs
    const td = calcTransferDuty(pp);
    const bondReg = dealData?.acq?.bondRegistration || 0;
    const attFees = dealData?.acq?.transferAttorneyFees || 0;
    const acqCosts = td + bondReg + attFees;

    // Holding costs
    const holding = dealData?.holding;
    const acq = dealData?.acq;
    let monthlyBond = 0;
    if (acq && !acq.cashPurchase) {
      monthlyBond = ((pp - (acq.deposit || 0)) * ((acq.bondRate || 0) / 100)) / 12;
    }
    const monthlyHolding = (holding?.ratesAndTaxes || 0) + (holding?.utilities || 0) +
      (holding?.insurance || 0) + (holding?.levies || 0) + (holding?.security || 0) + monthlyBond;
    const holdMonths = holding?.renovationMonths || 4;
    const holdCosts = monthlyHolding * holdMonths;

    // Renovation costs
    const renoCosts = dealData?.quickRenoEstimate || 0;

    // Resale costs
    const commPct = dealData?.resale?.agentCommission || 5;
    const resaleCosts = sp * (commPct / 100);

    totalActualReturn += sp;
    totalActualProfit += sp - pp - acqCosts - holdCosts - renoCosts - resaleCosts;
  }

  const allExpenses = deals.flatMap((d) => d.expenses || []);
  const totalActualExpenses = allExpenses.filter((e) => !e.isProjected).reduce((s, e) => s + e.amount, 0);
  const totalProjectedExpenses = allExpenses.filter((e) => e.isProjected).reduce((s, e) => s + e.amount, 0);

  return {
    totalDeals: deals.length,
    activeDeals: activeDeals.length,
    soldDeals: soldDeals.length,
    renovatingDeals: renovatingDeals.length,
    totalInvested,
    totalExpectedReturn,
    totalActualReturn,
    totalProjectedProfit,
    totalActualProfit,
    avgRoi: roiCount > 0 ? totalRoi / roiCount : 0,
    avgAnnualizedRoi: roiCount > 0 ? totalAnnualizedRoi / roiCount : 0,
    avgDaysInPipeline: daysCount > 0 ? Math.round(totalDays / daysCount) : 0,
    totalActualExpenses,
    totalProjectedExpenses,
    dealsByStage: Object.fromEntries(DEAL_STAGES.map((s) => [s.key, deals.filter((d) => d.stage === s.key).length])),
  };
}

export function getCashFlowProjection(deals: Deal[], monthsAhead = 6): { month: string; inflow: number; outflow: number; net: number }[] {
  const now = new Date();
  const months: { month: string; inflow: number; outflow: number; net: number }[] = [];

  for (let i = -3; i <= monthsAhead; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    months.push({ month: key, inflow: 0, outflow: 0, net: 0 });
  }

  for (const deal of deals) {
    // Outflows: expenses
    for (const expense of (deal.expenses || [])) {
      const m = expense.date.slice(0, 7);
      const row = months.find((r) => r.month === m);
      if (row) row.outflow += expense.amount;
    }

    // Inflow: sold deals
    if (deal.stage === "sold" && deal.soldDate) {
      const m = deal.soldDate.slice(0, 7);
      const row = months.find((r) => r.month === m);
      if (row) row.inflow += deal.actualSalePrice || deal.expectedSalePrice;
    }

    // Projected inflow: listed deals (estimate next month)
    if (deal.stage === "listed") {
      const futureDate = new Date(now.getFullYear(), now.getMonth() + 2, 1);
      const m = `${futureDate.getFullYear()}-${String(futureDate.getMonth() + 1).padStart(2, "0")}`;
      const row = months.find((r) => r.month === m);
      if (row) row.inflow += deal.expectedSalePrice;
    }
  }

  for (const m of months) {
    m.net = m.inflow - m.outflow;
  }

  return months;
}
