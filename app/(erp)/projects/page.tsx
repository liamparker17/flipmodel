"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { theme, fmt, pct } from "../../components/theme";
import useDeals from "../../hooks/api/useApiDeals";
import { getStageColor, getStageLabel, computeDealMetrics, getDealProgress, PRIORITY_CONFIG, getExpensesByCategory } from "../../utils/dealHelpers";
import type { Deal } from "../../types/deal";

export default function ProjectsPage() {
  const router = useRouter();
  const { deals, loaded } = useDeals();
  const [isMobile, setIsMobile] = useState(false);
  const [filter, setFilter] = useState<"all" | "purchased" | "renovating">("all");

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  if (!loaded) return <div style={{ padding: 40, color: theme.textDim }}>Loading...</div>;

  const allProjects = deals.filter((d) => d.stage === "purchased" || d.stage === "renovating");
  const projects = filter === "all" ? allProjects : allProjects.filter((d) => d.stage === filter);

  // Portfolio-level project metrics
  const totalBudget = projects.reduce((s, d) => s + (d.data?.quickRenoEstimate || 0), 0);
  const totalSpent = projects.reduce((s, d) => s + (d.expenses || []).filter((e) => !e.isProjected).reduce((ss, e) => ss + e.amount, 0), 0);
  const totalTasks = projects.reduce((s, d) => s + getDealProgress(d).total, 0);
  const completedTasks = projects.reduce((s, d) => s + getDealProgress(d).completed, 0);

  return (
    <div style={{ padding: isMobile ? 16 : 28, maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, paddingLeft: isMobile ? 48 : 0, flexWrap: "wrap", gap: 8 }}>
        <div>
          <h1 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 600, margin: 0, color: theme.text }}>Projects</h1>
          <p style={{ fontSize: 12, color: theme.textDim, margin: "2px 0 0" }}>{projects.length} active renovation{projects.length !== 1 ? "s" : ""}</p>
        </div>
        {/* Filter */}
        <div style={{ display: "flex", gap: 4 }}>
          {(["all", "purchased", "renovating"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)} style={{
              background: filter === f ? theme.accent : "transparent", color: filter === f ? "#000" : theme.textDim,
              border: filter === f ? "none" : `1px solid ${theme.cardBorder}`, borderRadius: 6,
              padding: "5px 12px", fontSize: 11, fontWeight: filter === f ? 600 : 400, cursor: "pointer", minHeight: 30,
              textTransform: "capitalize",
            }}>{f === "all" ? `All (${allProjects.length})` : `${getStageLabel(f)} (${allProjects.filter((d) => d.stage === f).length})`}</button>
          ))}
        </div>
      </div>

      {/* Portfolio KPIs */}
      {projects.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
          <div style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 8, padding: 14 }}>
            <div style={{ fontSize: 9, color: theme.textDim, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Total Budget</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: theme.text, fontFamily: "'JetBrains Mono', monospace" }}>{fmt(totalBudget)}</div>
          </div>
          <div style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 8, padding: 14 }}>
            <div style={{ fontSize: 9, color: theme.textDim, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Total Spent</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: theme.orange, fontFamily: "'JetBrains Mono', monospace" }}>{fmt(totalSpent)}</div>
            {totalBudget > 0 && (
              <div style={{ height: 4, background: theme.input, borderRadius: 2, marginTop: 4, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${Math.min((totalSpent / totalBudget) * 100, 100)}%`, background: totalSpent > totalBudget ? theme.red : theme.green, borderRadius: 2 }} />
              </div>
            )}
          </div>
          <div style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 8, padding: 14 }}>
            <div style={{ fontSize: 9, color: theme.textDim, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Budget Remaining</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: totalBudget - totalSpent >= 0 ? theme.green : theme.red, fontFamily: "'JetBrains Mono', monospace" }}>{fmt(totalBudget - totalSpent)}</div>
          </div>
          <div style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 8, padding: 14 }}>
            <div style={{ fontSize: 9, color: theme.textDim, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Task Progress</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: theme.accent, fontFamily: "'JetBrains Mono', monospace" }}>{completedTasks}/{totalTasks}</div>
            {totalTasks > 0 && (
              <div style={{ height: 4, background: theme.input, borderRadius: 2, marginTop: 4, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${(completedTasks / totalTasks) * 100}%`, background: theme.accent, borderRadius: 2 }} />
              </div>
            )}
          </div>
        </div>
      )}

      {projects.length === 0 ? (
        <div style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 8, padding: 40, textAlign: "center" }}>
          <p style={{ fontSize: 13, color: theme.textDim, marginBottom: 4 }}>No active projects.</p>
          <p style={{ fontSize: 12, color: theme.textDim }}>Move properties to &ldquo;Purchased&rdquo; or &ldquo;Renovating&rdquo; stage to see them here.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {projects.map((deal) => <ProjectCard key={deal.id} deal={deal} onClick={() => router.push(`/projects/${deal.id}`)} isMobile={isMobile} />)}
        </div>
      )}
    </div>
  );
}

function ProjectCard({ deal, onClick, isMobile }: { deal: Deal; onClick: () => void; isMobile: boolean }) {
  const stageColor = getStageColor(deal.stage);
  const metrics = computeDealMetrics(deal);
  const progress = getDealProgress(deal);
  const priorityConf = PRIORITY_CONFIG[deal.priority] || PRIORITY_CONFIG.medium;
  const actualExpenses = (deal.expenses || []).filter((e) => !e.isProjected).reduce((s, e) => s + e.amount, 0);
  const budget = deal.data?.quickRenoEstimate || 0;
  const budgetPct = budget > 0 ? (actualExpenses / budget) * 100 : 0;
  const categoryBreakdown = getExpensesByCategory((deal.expenses || []).filter((e) => !e.isProjected)).slice(0, 5);

  // Get next upcoming milestone
  const nextMilestone = (deal.milestones || [])
    .filter((m) => m.status !== "completed" && m.status !== "skipped")
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
  const isOverdue = nextMilestone && new Date(nextMilestone.dueDate) < new Date();

  return (
    <div onClick={onClick} style={{
      background: theme.card, border: `1px solid ${theme.cardBorder}`,
      borderRadius: 8, cursor: "pointer", overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{ padding: "12px 16px", borderBottom: `1px solid ${theme.cardBorder}`, display: "flex", alignItems: "center", justifyContent: "space-between", borderLeft: `4px solid ${stageColor}` }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: theme.text }}>{deal.name}</span>
            <span style={{ fontSize: 8, fontWeight: 600, color: stageColor, background: `${stageColor}15`, padding: "2px 6px", borderRadius: 3, textTransform: "uppercase" }}>{getStageLabel(deal.stage)}</span>
            <span style={{ fontSize: 8, fontWeight: 600, color: priorityConf.color }}>{priorityConf.icon} {priorityConf.label}</span>
          </div>
          {deal.address && <div style={{ fontSize: 11, color: theme.textDim }}>{deal.address}</div>}
        </div>
        <div style={{ display: "flex", gap: 12, flexShrink: 0 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 9, color: theme.textDim, textTransform: "uppercase" }}>Profit</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: metrics.estimatedProfit >= 0 ? theme.green : theme.red, fontFamily: "'JetBrains Mono', monospace" }}>{fmt(metrics.estimatedProfit)}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 9, color: theme.textDim, textTransform: "uppercase" }}>ROI</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: metrics.estimatedRoi >= 0.15 ? theme.green : theme.orange, fontFamily: "'JetBrains Mono', monospace" }}>{pct(metrics.estimatedRoi)}</div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: "12px 16px" }}>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
          {/* Progress */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: theme.textDim, marginBottom: 4 }}>
              <span>Project Progress</span>
              <span>{progress.total > 0 ? `${progress.completed}/${progress.total} tasks (${Math.round(progress.pct)}%)` : "No tasks"}</span>
            </div>
            <div style={{ height: 8, background: theme.input, borderRadius: 4, overflow: "hidden", marginBottom: 8 }}>
              <div style={{ height: "100%", width: `${progress.pct}%`, background: theme.accent, borderRadius: 4, transition: "width 0.3s" }} />
            </div>
            {/* Next milestone */}
            {nextMilestone && (
              <div style={{
                background: isOverdue ? `${theme.red}08` : theme.input, borderRadius: 4, padding: "6px 8px",
                borderLeft: `3px solid ${isOverdue ? theme.red : theme.accent}`, fontSize: 11,
              }}>
                <span style={{ color: theme.textDim }}>Next: </span>
                <span style={{ color: theme.text, fontWeight: 600 }}>{nextMilestone.title}</span>
                <span style={{ color: isOverdue ? theme.red : theme.textDim, marginLeft: 6, fontSize: 10 }}>
                  {isOverdue ? "OVERDUE — " : ""}due {new Date(nextMilestone.dueDate).toLocaleDateString("en-ZA", { day: "numeric", month: "short" })}
                </span>
              </div>
            )}
          </div>

          {/* Budget */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: theme.textDim, marginBottom: 4 }}>
              <span>Budget</span>
              <span>{fmt(actualExpenses)} / {fmt(budget)} ({Math.round(budgetPct)}%)</span>
            </div>
            <div style={{ height: 8, background: theme.input, borderRadius: 4, overflow: "hidden", marginBottom: 8 }}>
              <div style={{ height: "100%", width: `${Math.min(budgetPct, 100)}%`, background: budgetPct > 100 ? theme.red : budgetPct > 80 ? theme.orange : theme.green, borderRadius: 4 }} />
            </div>
            {/* Expense breakdown mini */}
            {categoryBreakdown.length > 0 && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {categoryBreakdown.map((cat) => (
                  <span key={cat.category} style={{ fontSize: 9, color: cat.color, background: `${cat.color}12`, padding: "1px 5px", borderRadius: 3 }}>
                    {cat.label}: {fmt(cat.actual)}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Contractors */}
        {(deal.contacts || []).filter((c) => c.role === "contractor").length > 0 && (
          <div style={{ borderTop: `1px solid ${theme.cardBorder}`, paddingTop: 8, marginTop: 8 }}>
            <div style={{ fontSize: 9, color: theme.textDim, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Contractors</div>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {(deal.contacts || []).filter((c) => c.role === "contractor").map((c) => (
                <span key={c.id} style={{ fontSize: 10, color: theme.text, background: theme.input, padding: "2px 6px", borderRadius: 3, display: "flex", alignItems: "center", gap: 4 }}>
                  {c.name}{c.profession ? ` (${c.profession})` : ""}
                  {(c.dailyRate || 0) > 0 && <span style={{ fontSize: 9, color: theme.textDim }}>{fmt((c.dailyRate || 0) * (c.daysWorked || 0))}</span>}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
