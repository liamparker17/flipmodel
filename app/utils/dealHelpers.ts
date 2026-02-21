// ─── Deal Pipeline Helpers ───
import type { Deal, DealStage, DealData, DealMetrics, StageDefinition, Expense } from "../types/deal";

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
  if (!dealData) return { purchasePrice: 0, expectedPrice: 0, renovationMonths: 4, estimatedProfit: 0, estimatedRoi: 0 };

  const { acq, holding, resale, mode, quickRenoEstimate } = dealData;
  const purchasePrice = acq?.purchasePrice || 0;
  const expectedPrice = resale?.expectedPrice || 0;
  const renovationMonths = holding?.renovationMonths || 4;
  const renoEstimate = mode === "quick" ? (quickRenoEstimate || 0) : (quickRenoEstimate || 0);
  const commission = expectedPrice * ((resale?.agentCommission || 5) / 100);

  const totalExpenses = (deal.expenses || []).filter((e) => !e.isProjected).reduce((s, e) => s + e.amount, 0);
  const projectedExpenses = (deal.expenses || []).filter((e) => e.isProjected).reduce((s, e) => s + e.amount, 0);

  const estimatedProfit = expectedPrice - purchasePrice - renoEstimate - commission;
  const estimatedRoi = purchasePrice > 0 ? estimatedProfit / purchasePrice : 0;

  const daysInPipeline = Math.floor((Date.now() - new Date(deal.createdAt).getTime()) / (1000 * 60 * 60 * 24));

  return {
    purchasePrice,
    expectedPrice,
    renovationMonths,
    estimatedProfit,
    estimatedRoi,
    totalExpenses,
    budgetVariance: totalExpenses + projectedExpenses - renoEstimate,
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
  let roiCount = 0;
  let totalDays = 0;
  let daysCount = 0;

  for (const deal of deals) {
    const m = computeDealMetrics(deal);
    totalInvested += m.purchasePrice;
    totalExpectedReturn += m.expectedPrice;
    totalProjectedProfit += m.estimatedProfit;
    if (m.estimatedRoi !== 0) { totalRoi += m.estimatedRoi; roiCount++; }
    if (m.daysInPipeline) { totalDays += m.daysInPipeline; daysCount++; }
  }

  for (const deal of soldDeals) {
    const sp = deal.actualSalePrice || deal.expectedSalePrice;
    const pp = deal.purchasePrice;
    const reno = deal.data?.quickRenoEstimate || 0;
    const comm = sp * ((deal.data?.resale?.agentCommission || 5) / 100);
    totalActualReturn += sp;
    totalActualProfit += sp - pp - reno - comm;
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
