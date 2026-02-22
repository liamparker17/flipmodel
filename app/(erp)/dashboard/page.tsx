"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { theme, fmt, pct } from "../../components/theme";
import useDeals from "../../hooks/api/useApiDeals";
import { DEAL_STAGES, computeDealMetrics, getPortfolioMetrics, getCashFlowProjection, getDealProgress, PRIORITY_CONFIG } from "../../utils/dealHelpers";
import { generateSuggestions } from "../../lib/automation";

export default function DashboardPage() {
  const router = useRouter();
  const { deals, loaded, createDeal } = useDeals();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  if (!loaded) return <div style={{ padding: 40, color: theme.textDim }}>Loading...</div>;

  const metrics = getPortfolioMetrics(deals);
  const cashFlow = getCashFlowProjection(deals);
  const recentDeals = [...deals].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 6);

  // Upcoming deadlines from milestones
  const upcomingDeadlines: { deal: string; dealId: string; dealStage: string; milestone: string; dueDate: string; status: string; overdue: boolean }[] = [];
  const now = new Date();
  for (const deal of deals) {
    if (deal.stage === "sold") continue;
    for (const ms of (deal.milestones || [])) {
      if (ms.status === "completed" || ms.status === "skipped") continue;
      const due = new Date(ms.dueDate);
      const overdue = due < now;
      upcomingDeadlines.push({ deal: deal.name, dealId: deal.id, dealStage: deal.stage, milestone: ms.title, dueDate: ms.dueDate, status: ms.status, overdue });
    }
  }
  upcomingDeadlines.sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  // Active projects needing attention
  const activeProjects = deals.filter((d) => d.stage === "purchased" || d.stage === "renovating");

  // Deal velocity: average days per stage transition (for sold deals)
  const soldDeals = deals.filter((d) => d.stage === "sold" && d.soldDate && d.createdAt);
  const avgDaysToSell = soldDeals.length > 0
    ? Math.round(soldDeals.reduce((s, d) => s + Math.floor((new Date(d.soldDate!).getTime() - new Date(d.createdAt).getTime()) / (1000 * 60 * 60 * 24)), 0) / soldDeals.length)
    : 0;

  // Cash flow chart max value
  const cfMax = Math.max(...cashFlow.map((m) => Math.max(Math.abs(m.inflow), Math.abs(m.outflow), 1)));

  const handleNewDeal = async () => {
    const deal = await createDeal("New Property");
    router.push(`/pipeline/${deal.id}`);
  };

  // --- Command Center: Action Items ---
  const suggestions = generateSuggestions(deals);

  // Overdue milestones (past due, not completed)
  const overdueMilestones: { dealId: string; dealName: string; dealStage: string; title: string; dueDate: string }[] = [];
  for (const deal of deals) {
    if (deal.stage === "sold") continue;
    for (const ms of (deal.milestones || [])) {
      if (ms.status === "completed" || ms.status === "skipped") continue;
      if (!ms.dueDate) continue;
      if (new Date(ms.dueDate) < now) {
        overdueMilestones.push({ dealId: deal.id, dealName: deal.name, dealStage: deal.stage, title: ms.title, dueDate: ms.dueDate });
      }
    }
  }

  // Budget alerts (actual spend > 80% of renovation estimate)
  const budgetAlerts: { dealId: string; dealName: string; actualSpend: number; budget: number; pct: number }[] = [];
  for (const deal of deals) {
    const actualExpenses = (deal.expenses || []).filter((e: any) => !e.isProjected).reduce((s: number, e: any) => s + e.amount, 0);
    const budget = deal.data?.quickRenoEstimate || 0;
    if (budget > 0 && actualExpenses > budget * 0.8) {
      budgetAlerts.push({ dealId: deal.id, dealName: deal.name, actualSpend: actualExpenses, budget, pct: Math.round((actualExpenses / budget) * 100) });
    }
  }

  // All action items combined
  const actionItems: { icon: string; description: string; link: string; color: string }[] = [];
  for (const om of overdueMilestones) {
    const route = om.dealStage === "purchased" || om.dealStage === "renovating" ? `/projects/${om.dealId}` : `/pipeline/${om.dealId}`;
    actionItems.push({ icon: "⏰", description: `Overdue: "${om.title}" on ${om.dealName} (due ${new Date(om.dueDate).toLocaleDateString("en-ZA", { day: "numeric", month: "short" })})`, link: route, color: theme.red });
  }
  for (const ba of budgetAlerts) {
    actionItems.push({ icon: "💸", description: `${ba.dealName} at ${ba.pct}% of budget (${fmt(ba.actualSpend)} / ${fmt(ba.budget)})`, link: `/projects/${ba.dealId}`, color: theme.orange });
  }
  for (const sg of suggestions.filter((s) => s.type === "stage_advance")) {
    actionItems.push({ icon: "🚀", description: sg.message, link: `/pipeline/${sg.dealId}`, color: theme.accent });
  }

  // Recent activity timeline (last 5 deals by updatedAt)
  const timelineDeals = [...deals].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 5);
  const timeAgo = (dateStr: string) => {
    const diff = now.getTime() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return `${Math.floor(days / 7)}w ago`;
  };

  return (
    <div style={{ padding: isMobile ? 16 : 28, maxWidth: 1400, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, paddingLeft: isMobile ? 48 : 0 }}>
        <div>
          <h1 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 600, margin: 0, color: theme.text }}>Dashboard</h1>
          <p style={{ fontSize: 12, color: theme.textDim, margin: "2px 0 0" }}>Portfolio overview &middot; {new Date().toLocaleDateString("en-ZA", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
        </div>
        <button onClick={handleNewDeal} style={{
          background: theme.accent, color: "#fff", border: "none", borderRadius: 6,
          padding: "8px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer", minHeight: 36,
        }}>+ New Property</button>
      </div>

      {/* Quick Actions Bar */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {[
          { label: "＋ New Deal", onClick: handleNewDeal, href: undefined as string | undefined },
          { label: "📝 Log Expense", onClick: undefined as (() => void) | undefined, href: "/projects" },
          { label: "💳 Record Payment", onClick: undefined as (() => void) | undefined, href: "/invoices" },
        ].map((action) => (
          <button
            key={action.label}
            onClick={action.onClick || (() => router.push(action.href!))}
            style={{
              background: "transparent",
              border: `1px solid ${theme.accent}`,
              borderRadius: 6,
              padding: "6px 14px",
              fontSize: 11,
              fontWeight: 600,
              color: theme.accent,
              cursor: "pointer",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = `${theme.accent}18`)}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            {action.label}
          </button>
        ))}
      </div>

      {/* KPI Row 1: Key Metrics */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
        <KPICard label="Total Properties" value={String(metrics.totalDeals)} sub={`${metrics.activeDeals} active`} color={theme.accent} />
        <KPICard label="Capital Deployed" value={fmt(metrics.totalInvested)} sub="Total purchase value" color={theme.text} />
        <KPICard label="Expected Profit" value={fmt(metrics.totalProjectedProfit)} sub="Across portfolio" color={metrics.totalProjectedProfit >= 0 ? theme.green : theme.red} />
        <KPICard label="Avg ROI" value={pct(metrics.avgRoi)} sub="Per property average" color={metrics.avgRoi >= 0.15 ? theme.green : theme.orange} />
        <KPICard label="Avg Days in Pipeline" value={metrics.avgDaysInPipeline > 0 ? `${metrics.avgDaysInPipeline}d` : "—"} sub={avgDaysToSell > 0 ? `${avgDaysToSell}d avg to sell` : "No sold deals"} color={theme.accent} />
      </div>

      {/* KPI Row 2: Financial */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
        <KPICard label="Active Projects" value={String(metrics.renovatingDeals)} sub="Purchased + Renovating" color={theme.orange} />
        <KPICard label="Actual Expenses" value={fmt(metrics.totalActualExpenses)} sub="Paid to date" color={theme.red} />
        <KPICard label="Projected Expenses" value={fmt(metrics.totalProjectedExpenses)} sub="Upcoming" color={theme.orange} />
        <KPICard label="Realized Profit" value={fmt(metrics.totalActualProfit)} sub={`${metrics.soldDeals} sold propert${metrics.soldDeals !== 1 ? "ies" : "y"}`} color={metrics.totalActualProfit >= 0 ? theme.green : theme.red} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16, marginBottom: 16 }}>
        {/* Pipeline Summary */}
        <div style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 8, padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <h3 style={{ fontSize: 11, fontWeight: 600, color: theme.textDim, textTransform: "uppercase", letterSpacing: 0.8, margin: 0 }}>Pipeline Funnel</h3>
            <button onClick={() => router.push("/pipeline")} style={{ background: "transparent", border: "none", color: theme.accent, fontSize: 11, cursor: "pointer", padding: 0, fontWeight: 500 }}>View all →</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {DEAL_STAGES.map((stage) => {
              const count = deals.filter((d) => d.stage === stage.key).length;
              const pctOfTotal = deals.length > 0 ? (count / deals.length) * 100 : 0;
              return (
                <div key={stage.key} onClick={() => router.push("/pipeline")} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", padding: "4px 0" }}>
                  <div style={{ width: 70, fontSize: 10, color: stage.color, fontWeight: 600 }}>{stage.label}</div>
                  <div style={{ flex: 1, height: 16, background: theme.input, borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pctOfTotal}%`, background: stage.color, borderRadius: 3, opacity: 0.7, transition: "width 0.4s", minWidth: count > 0 ? 4 : 0 }} />
                  </div>
                  <div style={{ width: 20, fontSize: 12, fontWeight: 700, color: stage.color, textAlign: "right", fontFamily: "'JetBrains Mono', monospace" }}>{count}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Cash Flow Projection */}
        <div style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 8, padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <h3 style={{ fontSize: 11, fontWeight: 600, color: theme.textDim, textTransform: "uppercase", letterSpacing: 0.8, margin: 0 }}>Cash Flow</h3>
            <div style={{ display: "flex", gap: 12 }}>
              <span style={{ fontSize: 9, display: "flex", alignItems: "center", gap: 3 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: theme.green, display: "inline-block" }} /> <span style={{ color: theme.textDim }}>Inflow</span></span>
              <span style={{ fontSize: 9, display: "flex", alignItems: "center", gap: 3 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: theme.red, display: "inline-block" }} /> <span style={{ color: theme.textDim }}>Outflow</span></span>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {cashFlow.map((m) => {
              const monthLabel = new Date(m.month + "-01").toLocaleDateString("en-ZA", { month: "short", year: "2-digit" });
              const isCurrentMonth = m.month === `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
              return (
                <div key={m.month} style={{ display: "flex", alignItems: "center", gap: 6, opacity: isCurrentMonth ? 1 : 0.7 }}>
                  <div style={{ width: 46, fontSize: 10, color: isCurrentMonth ? theme.accent : theme.textDim, fontWeight: isCurrentMonth ? 700 : 400, fontFamily: "'JetBrains Mono', monospace" }}>{monthLabel}</div>
                  <div style={{ flex: 1, display: "flex", gap: 2 }}>
                    {m.inflow > 0 && <div style={{ height: 12, width: `${(m.inflow / cfMax) * 100}%`, background: theme.green, borderRadius: 2, opacity: 0.6, minWidth: 3 }} />}
                    {m.outflow > 0 && <div style={{ height: 12, width: `${(m.outflow / cfMax) * 100}%`, background: theme.red, borderRadius: 2, opacity: 0.6, minWidth: 3 }} />}
                  </div>
                  <div style={{ width: 80, fontSize: 10, textAlign: "right", fontFamily: "'JetBrains Mono', monospace", color: m.net >= 0 ? theme.green : theme.red }}>{fmt(m.net)}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16, marginBottom: 16 }}>
        {/* Upcoming Deadlines */}
        <div style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 8, padding: 16 }}>
          <h3 style={{ fontSize: 11, fontWeight: 600, color: theme.textDim, textTransform: "uppercase", letterSpacing: 0.8, margin: "0 0 12px" }}>Upcoming Deadlines</h3>
          {upcomingDeadlines.length === 0 ? (
            <p style={{ fontSize: 12, color: theme.textDim, margin: 0 }}>No upcoming deadlines. Add milestones to your properties.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 220, overflowY: "auto" }}>
              {upcomingDeadlines.slice(0, 8).map((dl, i) => (
                <div key={i} onClick={() => router.push(dl.dealStage === "purchased" || dl.dealStage === "renovating" ? `/projects/${dl.dealId}` : `/pipeline/${dl.dealId}`)} style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "6px 8px",
                  background: dl.overdue ? `${theme.red}08` : theme.input, borderRadius: 4,
                  borderLeft: `3px solid ${dl.overdue ? theme.red : theme.accent}`,
                  cursor: "pointer",
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: theme.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{dl.milestone}</div>
                    <div style={{ fontSize: 10, color: theme.textDim }}>{dl.deal}</div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: dl.overdue ? theme.red : theme.textDim, fontFamily: "'JetBrains Mono', monospace" }}>
                      {new Date(dl.dueDate).toLocaleDateString("en-ZA", { day: "numeric", month: "short" })}
                    </div>
                    {dl.overdue && <div style={{ fontSize: 8, color: theme.red, fontWeight: 700, textTransform: "uppercase" }}>Overdue</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Active Projects Quick View */}
        <div style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 8, padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <h3 style={{ fontSize: 11, fontWeight: 600, color: theme.textDim, textTransform: "uppercase", letterSpacing: 0.8, margin: 0 }}>Active Projects</h3>
            <button onClick={() => router.push("/projects")} style={{ background: "transparent", border: "none", color: theme.accent, fontSize: 11, cursor: "pointer", padding: 0, fontWeight: 500 }}>View all →</button>
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
                return (
                  <div key={deal.id} onClick={() => router.push(`/projects/${deal.id}`)} style={{
                    background: theme.input, borderRadius: 6, padding: "8px 10px", cursor: "pointer",
                    borderLeft: `3px solid ${stageColor}`,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: theme.text }}>{deal.name}</span>
                      <span style={{ fontSize: 9, color: PRIORITY_CONFIG[deal.priority]?.color || theme.textDim, fontWeight: 600 }}>
                        {PRIORITY_CONFIG[deal.priority]?.icon} {PRIORITY_CONFIG[deal.priority]?.label}
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
      </div>

      {/* Recent Deals */}
      <div style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 8, padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <h3 style={{ fontSize: 11, fontWeight: 600, color: theme.textDim, textTransform: "uppercase", letterSpacing: 0.8, margin: 0 }}>Recent Activity</h3>
          <button onClick={() => router.push("/pipeline")} style={{ background: "transparent", border: "none", color: theme.accent, fontSize: 11, cursor: "pointer", padding: 0, fontWeight: 500 }}>View all →</button>
        </div>
        {recentDeals.length === 0 ? (
          <p style={{ fontSize: 12, color: theme.textDim }}>No properties yet. Add your first property to get started.</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 6 }}>
            {recentDeals.map((deal) => {
              const m = computeDealMetrics(deal);
              const stageInfo = DEAL_STAGES.find((s) => s.key === deal.stage);
              const lastActivity = [...(deal.activities || [])].sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];
              return (
                <div key={deal.id} onClick={() => router.push(`/pipeline/${deal.id}`)} style={{
                  background: theme.input, borderRadius: 6, padding: "10px 12px", cursor: "pointer",
                  borderLeft: `3px solid ${stageInfo?.color || theme.textDim}`,
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: theme.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, minWidth: 0 }}>{deal.name}</span>
                    <span style={{ fontSize: 8, fontWeight: 600, color: stageInfo?.color, background: `${stageInfo?.color}15`, padding: "2px 6px", borderRadius: 3, textTransform: "uppercase", flexShrink: 0, marginLeft: 6 }}>{stageInfo?.label}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <div>
                      <div style={{ fontSize: 9, color: theme.textDim }}>Profit</div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: m.estimatedProfit >= 0 ? theme.green : theme.red, fontFamily: "'JetBrains Mono', monospace" }}>{fmt(m.estimatedProfit)}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 9, color: theme.textDim }}>ROI</div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: m.estimatedRoi >= 0.15 ? theme.green : m.estimatedRoi >= 0 ? theme.orange : theme.red, fontFamily: "'JetBrains Mono', monospace" }}>{pct(m.estimatedRoi)}</div>
                    </div>
                  </div>
                  {lastActivity && (
                    <div style={{ fontSize: 9, color: theme.textDim, borderTop: `1px solid ${theme.cardBorder}`, paddingTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {lastActivity.description} &middot; {new Date(lastActivity.timestamp).toLocaleDateString("en-ZA", { day: "numeric", month: "short" })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Action Items Panel */}
      <div style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 8, padding: 16, marginTop: 16 }}>
        <h3 style={{ fontSize: 11, fontWeight: 600, color: theme.textDim, textTransform: "uppercase", letterSpacing: 0.8, margin: "0 0 12px" }}>Action Items</h3>
        {actionItems.length === 0 ? (
          <p style={{ fontSize: 12, color: theme.textDim, margin: 0 }}>No action items right now. Everything looks good.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 280, overflowY: "auto" }}>
            {actionItems.map((item, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 10, padding: "8px 10px",
                background: theme.input, borderRadius: 6,
                borderLeft: `3px solid ${item.color}`,
              }}>
                <span style={{ fontSize: 14, flexShrink: 0 }}>{item.icon}</span>
                <span style={{ flex: 1, fontSize: 11, color: theme.text, lineHeight: 1.4 }}>{item.description}</span>
                <button
                  onClick={() => router.push(item.link)}
                  style={{
                    background: "transparent", border: `1px solid ${theme.accent}`, borderRadius: 4,
                    padding: "3px 10px", fontSize: 10, fontWeight: 600, color: theme.accent,
                    cursor: "pointer", flexShrink: 0, whiteSpace: "nowrap",
                  }}
                >
                  View →
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Activity Timeline */}
      <div style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 8, padding: 16, marginTop: 16 }}>
        <h3 style={{ fontSize: 11, fontWeight: 600, color: theme.textDim, textTransform: "uppercase", letterSpacing: 0.8, margin: "0 0 12px" }}>Activity Timeline</h3>
        {timelineDeals.length === 0 ? (
          <p style={{ fontSize: 12, color: theme.textDim, margin: 0 }}>No recent activity.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {timelineDeals.map((deal, i) => {
              const stageInfo = DEAL_STAGES.find((s) => s.key === deal.stage);
              return (
                <div key={deal.id} style={{ display: "flex", gap: 12, position: "relative" }}>
                  {/* Timeline line */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 16, flexShrink: 0 }}>
                    <div style={{
                      width: 8, height: 8, borderRadius: "50%", background: stageInfo?.color || theme.accent,
                      border: `2px solid ${theme.card}`, flexShrink: 0, zIndex: 1, marginTop: 4,
                    }} />
                    {i < timelineDeals.length - 1 && (
                      <div style={{ width: 1, flex: 1, background: theme.cardBorder, minHeight: 20 }} />
                    )}
                  </div>
                  {/* Content */}
                  <div
                    onClick={() => router.push(`/pipeline/${deal.id}`)}
                    style={{ flex: 1, paddingBottom: i < timelineDeals.length - 1 ? 12 : 0, cursor: "pointer" }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: theme.text }}>{deal.name}</span>
                      <span style={{
                        fontSize: 8, fontWeight: 600, color: stageInfo?.color,
                        background: `${stageInfo?.color}15`, padding: "1px 6px", borderRadius: 3,
                        textTransform: "uppercase",
                      }}>{stageInfo?.label}</span>
                    </div>
                    <span style={{ fontSize: 10, color: theme.textDim, fontFamily: "'JetBrains Mono', monospace" }}>
                      {timeAgo(deal.updatedAt)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function KPICard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 8, padding: 14 }}>
      <div style={{ fontSize: 9, color: theme.textDim, textTransform: "uppercase", letterSpacing: 0.6, fontWeight: 500, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color, fontFamily: "'JetBrains Mono', monospace", marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</div>
      <div style={{ fontSize: 10, color: theme.textDim }}>{sub}</div>
    </div>
  );
}
