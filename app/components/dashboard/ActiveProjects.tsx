"use client";
import { theme, fmt, styles } from "../theme";
import { DEAL_STAGES, getDealProgress, PRIORITY_CONFIG } from "../../utils/dealHelpers";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import type { Deal } from "../../types/deal";

interface ActiveProjectsProps {
  activeProjects: Deal[];
  router: AppRouterInstance;
}

export default function ActiveProjects({ activeProjects, router }: ActiveProjectsProps) {
  return (
    <div style={styles.card} role="region" aria-label="Active projects">
      <div style={{ ...styles.flexBetween, marginBottom: 12 }}>
        <h3 style={styles.sectionHeading as React.CSSProperties}>Active Projects</h3>
        <button onClick={() => router.push("/projects")} aria-label="View all active projects" style={styles.linkBtn as React.CSSProperties}>View all →</button>
      </div>
      {activeProjects.length === 0 ? (
        <p style={{ fontSize: 12, color: theme.textDim, margin: 0 }}>No active renovation projects.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {activeProjects.slice(0, 4).map((deal) => {
            const progress = getDealProgress(deal);
            const stageColor = DEAL_STAGES.find((s) => s.key === deal.stage)?.color || theme.textDim;
            const actualExpenses = (deal.expenses || []).filter((e) => !e.isProjected).reduce((s, e) => s + e.amount, 0);
            const budget = deal.data?.quickRenoEstimate || 0;
            const budgetPct = budget > 0 ? (actualExpenses / budget) * 100 : 0;
            const pri = (PRIORITY_CONFIG as Record<string, { color: string; icon: string; label: string }>)[deal.priority as string];
            return (
              <div key={deal.id} onClick={() => router.push(`/projects/${deal.id}`)} role="button" tabIndex={0} aria-label={`${deal.name} - ${pri?.label || "medium"} priority`} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") router.push(`/projects/${deal.id}`); }} style={{
                background: theme.input, borderRadius: 6, padding: "8px 10px", cursor: "pointer",
                borderLeft: `3px solid ${stageColor}`,
              }}>
                <div style={{ ...styles.flexBetween, marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: theme.text }}>{deal.name}</span>
                  <span style={{ fontSize: 9, color: pri?.color || theme.textDim, fontWeight: 600 }}>
                    {pri?.icon} {pri?.label}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: theme.textDim, marginBottom: 2 }}>
                      <span>Progress</span>
                      <span>{progress.completed}/{progress.total} tasks</span>
                    </div>
                    <div style={{ height: 4, background: theme.cardBorder, borderRadius: 2, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${progress.pct}%`, background: theme.accent, borderRadius: 2, transition: "width 0.3s" }} />
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: theme.textDim, marginBottom: 2 }}>
                      <span>Budget</span>
                      <span>{fmt(actualExpenses)} / {fmt(budget)}</span>
                    </div>
                    <div style={{ height: 4, background: theme.cardBorder, borderRadius: 2, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${Math.min(budgetPct, 100)}%`, background: budgetPct > 100 ? theme.red : budgetPct > 80 ? theme.orange : theme.green, borderRadius: 2, transition: "width 0.3s" }} />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
