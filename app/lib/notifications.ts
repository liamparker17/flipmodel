import type { Deal, Milestone } from "../types/deal";
import type { Tool, ToolCheckout } from "../types/tool";

export interface NotificationData {
  type: string;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
}

/**
 * Generate notifications based on current data state.
 * Called server-side to create Notification records.
 */
export function generateNotifications(
  deals: Deal[],
  tools: Tool[],
  checkouts: ToolCheckout[]
): NotificationData[] {
  const notifications: NotificationData[] = [];

  // Deadline warnings — milestones due within 3 days
  const soon = new Date();
  soon.setDate(soon.getDate() + 3);

  for (const deal of deals) {
    for (const m of deal.milestones) {
      if (m.status === "completed" || m.status === "skipped" || !m.dueDate) continue;
      const due = new Date(m.dueDate);
      if (due <= soon && due >= new Date()) {
        notifications.push({
          type: "deadline_warning",
          title: "Milestone Due Soon",
          message: `"${m.title}" on ${deal.name} is due ${due.toLocaleDateString("en-ZA")}`,
          metadata: { dealId: deal.id, milestoneId: m.id },
        });
      }
      if (due < new Date()) {
        notifications.push({
          type: "milestone_overdue",
          title: "Milestone Overdue",
          message: `"${m.title}" on ${deal.name} was due ${due.toLocaleDateString("en-ZA")}`,
          metadata: { dealId: deal.id, milestoneId: m.id },
        });
      }
    }

    // Budget alerts
    const totalExpenses = deal.expenses
      .filter((e) => !e.isProjected)
      .reduce((s, e) => s + e.amount, 0);
    const budget = deal.data.quickRenoEstimate || 0;
    if (budget > 0 && totalExpenses > budget * 0.8) {
      notifications.push({
        type: "budget_alert",
        title: "Budget Warning",
        message: `${deal.name}: expenses at ${Math.round((totalExpenses / budget) * 100)}% of budget`,
        metadata: { dealId: deal.id },
      });
    }
  }

  // Overdue tool returns
  for (const co of checkouts) {
    if (co.returnedAt || !co.expectedReturnDate) continue;
    const returnDate = new Date(co.expectedReturnDate);
    if (returnDate < new Date()) {
      const tool = tools.find((t) => t.id === co.toolId);
      notifications.push({
        type: "tool_overdue",
        title: "Tool Return Overdue",
        message: `${tool?.name || "Tool"} checked out to ${co.contractorName} was due back ${returnDate.toLocaleDateString("en-ZA")}`,
        metadata: { toolId: co.toolId, checkoutId: co.id },
      });
    }
  }

  return notifications;
}
