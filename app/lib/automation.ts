import type { Deal, Milestone } from "../types/deal";

export interface AutoSuggestion {
  dealId: string;
  dealName: string;
  type: "stage_advance" | "deadline_warning" | "budget_alert";
  message: string;
  suggestedAction?: string;
}

/**
 * Generate automation suggestions based on deal state.
 */
export function generateSuggestions(deals: Deal[]): AutoSuggestion[] {
  const suggestions: AutoSuggestion[] = [];

  for (const deal of deals) {
    // All renovation milestones complete → suggest moving to "listed"
    if (deal.stage === "renovating" && deal.milestones.length > 0) {
      const allComplete = deal.milestones.every(
        (m: Milestone) => m.status === "completed" || m.status === "skipped"
      );
      if (allComplete) {
        suggestions.push({
          dealId: deal.id,
          dealName: deal.name,
          type: "stage_advance",
          message: `All milestones complete for ${deal.name} — ready to list?`,
          suggestedAction: "listed",
        });
      }
    }

    // Analysis complete, no offer yet → suggest making offer
    if (deal.stage === "analysing" && deal.data?.resale?.expectedPrice > 0 && !deal.offerAmount) {
      suggestions.push({
        dealId: deal.id,
        dealName: deal.name,
        type: "stage_advance",
        message: `Analysis complete for ${deal.name} — ready to make an offer?`,
        suggestedAction: "offer_made",
      });
    }

    // Overdue milestones
    const overdue = deal.milestones.filter((m: Milestone) => {
      if (m.status === "completed" || m.status === "skipped") return false;
      if (!m.dueDate) return false;
      return new Date(m.dueDate) < new Date();
    });
    for (const m of overdue) {
      suggestions.push({
        dealId: deal.id,
        dealName: deal.name,
        type: "deadline_warning",
        message: `Milestone "${m.title}" is overdue on ${deal.name}`,
      });
    }

    // Budget alert: actual expenses > 80% of estimated renovation
    const totalActualExpenses = deal.expenses
      .filter((e) => !e.isProjected)
      .reduce((sum, e) => sum + e.amount, 0);
    const budgetEstimate = deal.data?.quickRenoEstimate || 0;
    if (budgetEstimate > 0 && totalActualExpenses > budgetEstimate * 0.8) {
      const pct = Math.round((totalActualExpenses / budgetEstimate) * 100);
      suggestions.push({
        dealId: deal.id,
        dealName: deal.name,
        type: "budget_alert",
        message: `${deal.name} is at ${pct}% of renovation budget (${new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(totalActualExpenses)} / ${new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(budgetEstimate)})`,
      });
    }
  }

  return suggestions;
}
