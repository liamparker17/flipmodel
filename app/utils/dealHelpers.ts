// ─── Deal Pipeline Helpers ───
import type { Deal, DealStage, DealData, DealMetrics, StageDefinition } from "../types/deal";

export const DEAL_STAGES: StageDefinition[] = [
  { key: "lead", label: "Lead", color: "#94A3B8" },
  { key: "analysing", label: "Analysing", color: "#60A5FA" },
  { key: "offer_made", label: "Offer Made", color: "#C084FC" },
  { key: "purchased", label: "Purchased", color: "#34D399" },
  { key: "renovating", label: "Renovating", color: "#FB923C" },
  { key: "listed", label: "Listed", color: "#F472B6" },
  { key: "sold", label: "Sold", color: "#22D3EE" },
];

export function getStageColor(stageKey: string): string {
  const stage = DEAL_STAGES.find((s) => s.key === stageKey);
  return stage ? stage.color : "#94A3B8";
}

export function getStageLabel(stageKey: string): string {
  const stage = DEAL_STAGES.find((s) => s.key === stageKey);
  return stage ? stage.label : stageKey;
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

export function computeDealMetrics(dealData: DealData | undefined | null): DealMetrics | null {
  if (!dealData) return null;
  const { acq, holding, resale, mode, quickRenoEstimate } = dealData;
  if (!acq || !resale) return null;

  const purchasePrice = acq.purchasePrice || 0;
  const expectedPrice = resale.expectedPrice || 0;
  const renovationMonths = holding?.renovationMonths || 4;

  const estimatedProfit = expectedPrice - purchasePrice - (mode === "quick" ? (quickRenoEstimate || 0) : 0);
  const estimatedRoi = purchasePrice > 0 ? estimatedProfit / purchasePrice : 0;

  return { purchasePrice, expectedPrice, renovationMonths, estimatedProfit, estimatedRoi };
}
