"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { theme, fmt, pct } from "../../../components/theme";
import useDeals from "../../../hooks/useDeals";
import { getStageColor, getStageLabel, computeDealMetrics, getDealProgress, getExpensesByCategory, PRIORITY_CONFIG } from "../../../utils/dealHelpers";
import type { Deal } from "../../../types/deal";

export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const router = useRouter();
  const { getDeal } = useDeals();
  const [deal, setDeal] = useState<Deal | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    const d = getDeal(projectId);
    if (d) setDeal(d);
  }, [projectId, getDeal]);

  if (!deal) {
    return (
      <div style={{ padding: 40, color: theme.textDim }}>
        <p>Project not found.</p>
        <button onClick={() => router.push("/projects")} style={{ background: theme.accent, color: "#fff", border: "none", borderRadius: 6, padding: "8px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer", marginTop: 12 }}>
          Back to Projects
        </button>
      </div>
    );
  }

  const stageColor = getStageColor(deal.stage);
  const metrics = computeDealMetrics(deal);
  const progress = getDealProgress(deal);
  const actualExpenses = (deal.expenses || []).filter((e) => !e.isProjected).reduce((s, e) => s + e.amount, 0);
  const projectedExpenses = (deal.expenses || []).filter((e) => e.isProjected).reduce((s, e) => s + e.amount, 0);
  const budget = deal.data?.quickRenoEstimate || 0;
  const budgetPct = budget > 0 ? (actualExpenses / budget) * 100 : 0;
  const categoryBreakdown = getExpensesByCategory(deal.expenses || []);
  const milestones = [...(deal.milestones || [])].sort((a, b) => a.order - b.order);
  const priorityConf = PRIORITY_CONFIG[deal.priority] || PRIORITY_CONFIG.medium;

  return (
    <div style={{ padding: isMobile ? 16 : 28, maxWidth: 1000, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, paddingLeft: isMobile ? 48 : 0 }}>
        <button onClick={() => router.push("/projects")} style={{
          background: theme.input, border: `1px solid ${theme.inputBorder}`, borderRadius: 6,
          width: 32, height: 32, color: theme.textDim, fontSize: 14, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>&larr;</button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <h1 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 600, margin: 0, color: theme.text }}>{deal.name}</h1>
            <span style={{ fontSize: 9, fontWeight: 600, color: stageColor, background: `${stageColor}15`, padding: "3px 8px", borderRadius: 4, textTransform: "uppercase" }}>{getStageLabel(deal.stage)}</span>
            <span style={{ fontSize: 9, fontWeight: 600, color: priorityConf.color }}>{priorityConf.icon} {priorityConf.label}</span>
          </div>
          {deal.address && <div style={{ fontSize: 11, color: theme.textDim, marginTop: 1 }}>{deal.address}</div>}
        </div>
      </div>

      {/* Key Metrics */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
        {[
          { label: "Purchase", value: fmt(metrics.purchasePrice), color: theme.text },
          { label: "Budget", value: fmt(budget), color: theme.orange },
          { label: "Spent", value: fmt(actualExpenses), color: budgetPct > 100 ? theme.red : theme.text },
          { label: "Expected Sale", value: fmt(metrics.expectedPrice), color: theme.accent },
          { label: "Est. Profit", value: fmt(metrics.estimatedProfit), color: metrics.estimatedProfit >= 0 ? theme.green : theme.red },
        ].map((m) => (
          <div key={m.label} style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 8, padding: 12 }}>
            <div style={{ fontSize: 9, color: theme.textDim, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 }}>{m.label}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: m.color, fontFamily: "'JetBrains Mono', monospace" }}>{m.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16, marginBottom: 16 }}>
        {/* Progress */}
        <div style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 8, padding: 16 }}>
          <h3 style={{ fontSize: 11, fontWeight: 600, color: theme.textDim, textTransform: "uppercase", letterSpacing: 0.8, margin: "0 0 12px" }}>Project Progress</h3>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: theme.textDim, marginBottom: 6 }}>
            <span>{progress.completed}/{progress.total} tasks completed</span>
            <span>{Math.round(progress.pct)}%</span>
          </div>
          <div style={{ height: 10, background: theme.input, borderRadius: 5, overflow: "hidden", marginBottom: 12 }}>
            <div style={{ height: "100%", width: `${progress.pct}%`, background: theme.accent, borderRadius: 5, transition: "width 0.3s" }} />
          </div>
          {/* Milestones list */}
          {milestones.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {milestones.map((ms) => {
                const tasksDone = ms.tasks.filter((t) => t.completed).length;
                const isOverdue = new Date(ms.dueDate) < new Date() && ms.status !== "completed" && ms.status !== "skipped";
                const statusColors: Record<string, string> = { pending: theme.textDim, in_progress: theme.accent, completed: theme.green, overdue: theme.red, skipped: theme.textDim };
                const color = isOverdue ? theme.red : statusColors[ms.status] || theme.textDim;
                return (
                  <div key={ms.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 8px", background: theme.input, borderRadius: 4, borderLeft: `3px solid ${color}` }}>
                    <div style={{ width: 16, height: 16, borderRadius: "50%", background: ms.status === "completed" ? theme.green : `${color}20`, border: `1.5px solid ${color}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, color: ms.status === "completed" ? "#fff" : color, fontWeight: 700, flexShrink: 0 }}>
                      {ms.status === "completed" ? "✓" : ""}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, color: ms.status === "completed" ? theme.textDim : theme.text, fontWeight: 600, textDecoration: ms.status === "completed" ? "line-through" : "none" }}>{ms.title}</div>
                    </div>
                    {ms.tasks.length > 0 && <span style={{ fontSize: 9, color: theme.textDim }}>{tasksDone}/{ms.tasks.length}</span>}
                    <span style={{ fontSize: 9, color: isOverdue ? theme.red : theme.textDim, fontFamily: "'JetBrains Mono', monospace" }}>
                      {new Date(ms.dueDate).toLocaleDateString("en-ZA", { day: "numeric", month: "short" })}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p style={{ fontSize: 11, color: theme.textDim, margin: 0 }}>No milestones set. Open full analysis to add milestones.</p>
          )}
        </div>

        {/* Budget */}
        <div style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 8, padding: 16 }}>
          <h3 style={{ fontSize: 11, fontWeight: 600, color: theme.textDim, textTransform: "uppercase", letterSpacing: 0.8, margin: "0 0 12px" }}>Budget Tracking</h3>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: theme.textDim, marginBottom: 6 }}>
            <span>Spent: {fmt(actualExpenses)}</span>
            <span>Budget: {fmt(budget)}</span>
          </div>
          <div style={{ height: 10, background: theme.input, borderRadius: 5, overflow: "hidden", marginBottom: 4 }}>
            <div style={{ height: "100%", width: `${Math.min(budgetPct, 100)}%`, background: budgetPct > 100 ? theme.red : budgetPct > 80 ? theme.orange : theme.green, borderRadius: 5 }} />
          </div>
          <div style={{ fontSize: 10, color: budgetPct > 100 ? theme.red : theme.textDim, marginBottom: 12 }}>
            {budgetPct > 100 ? `Over budget by ${fmt(actualExpenses - budget)}` : `${fmt(budget - actualExpenses)} remaining (${Math.round(budgetPct)}% used)`}
          </div>
          {/* Category breakdown */}
          {categoryBreakdown.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {categoryBreakdown.slice(0, 6).map((cat) => (
                <div key={cat.category} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: cat.color, flexShrink: 0 }} />
                  <div style={{ flex: 1, fontSize: 10, color: theme.text }}>{cat.label}</div>
                  <div style={{ fontSize: 10, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", color: theme.text }}>{fmt(cat.actual)}</div>
                </div>
              ))}
            </div>
          )}
          {categoryBreakdown.length === 0 && <p style={{ fontSize: 11, color: theme.textDim, margin: 0 }}>No expenses tracked yet.</p>}
        </div>
      </div>

      {/* Contractors */}
      <div style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 8, padding: 16, marginBottom: 16 }}>
        <h3 style={{ fontSize: 11, fontWeight: 600, color: theme.textDim, textTransform: "uppercase", letterSpacing: 0.8, margin: "0 0 12px" }}>Team & Contractors</h3>
        {(deal.contacts || []).length > 0 || (deal.data?.contractors || []).length > 0 ? (
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 6 }}>
            {(deal.contacts || []).map((c) => (
              <div key={c.id} style={{ background: theme.input, borderRadius: 6, padding: "8px 10px", display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: theme.accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
                  {c.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: theme.text }}>{c.name}</div>
                  <div style={{ fontSize: 9, color: theme.textDim }}>{c.role}{c.company ? ` — ${c.company}` : ""}</div>
                </div>
                {c.phone && <span style={{ fontSize: 10, color: theme.accent }}>{c.phone}</span>}
              </div>
            ))}
            {(deal.data?.contractors || []).map((c, i) => (
              <div key={`ct-${i}`} style={{ background: theme.input, borderRadius: 6, padding: "8px 10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: theme.text }}>{c.name || "Unnamed"}</div>
                  <div style={{ fontSize: 10, color: theme.textDim }}>{c.profession}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: theme.accent, fontFamily: "'JetBrains Mono', monospace" }}>{fmt(c.dailyRate * c.daysWorked)}</div>
                  <div style={{ fontSize: 9, color: theme.textDim }}>{c.daysWorked} days × {fmt(c.dailyRate)}/day</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ fontSize: 11, color: theme.textDim, margin: 0 }}>No contractors or contacts assigned.</p>
        )}
      </div>

      {/* Notes */}
      {deal.notes && (
        <div style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 8, padding: 16, marginBottom: 16 }}>
          <h3 style={{ fontSize: 11, fontWeight: 600, color: theme.textDim, textTransform: "uppercase", letterSpacing: 0.8, margin: "0 0 8px" }}>Notes</h3>
          <p style={{ fontSize: 12, color: theme.text, lineHeight: 1.6, margin: 0, whiteSpace: "pre-wrap" }}>{deal.notes}</p>
        </div>
      )}

      <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
        <button onClick={() => router.push(`/pipeline/${deal.id}`)} style={{
          background: theme.accent, color: "#fff", border: "none", borderRadius: 6,
          padding: "10px 20px", fontSize: 12, fontWeight: 600, cursor: "pointer",
        }}>Open Full Deal View</button>
        <button onClick={() => router.push("/projects")} style={{
          background: "transparent", border: `1px solid ${theme.cardBorder}`, borderRadius: 6,
          padding: "10px 20px", fontSize: 12, color: theme.textDim, cursor: "pointer",
        }}>Back to Projects</button>
      </div>
    </div>
  );
}
