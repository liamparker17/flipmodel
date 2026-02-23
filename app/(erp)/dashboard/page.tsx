"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { theme, fmt, pct, styles } from "../../components/theme";
import useDeals from "../../hooks/api/useApiDeals";
import { DEAL_STAGES, computeDealMetrics, getPortfolioMetrics, getCashFlowProjection } from "../../utils/dealHelpers";
import { generateSuggestions } from "../../lib/automation";
import KPIGrid from "../../components/dashboard/KPIGrid";
import PipelineFunnel from "../../components/dashboard/PipelineFunnel";
import CashFlowChart from "../../components/dashboard/CashFlowChart";
import DeadlinesList from "../../components/dashboard/DeadlinesList";
import ActiveProjects from "../../components/dashboard/ActiveProjects";
import ActionItems from "../../components/dashboard/ActionItems";
import ActivityTimeline from "../../components/dashboard/ActivityTimeline";

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

  // Single pass: upcoming deadlines + overdue milestones
  const upcomingDeadlines: { deal: string; dealId: string; dealStage: string; milestone: string; dueDate: string; status: string; overdue: boolean }[] = [];
  const overdueMilestones: { dealId: string; dealName: string; dealStage: string; title: string; dueDate: string }[] = [];
  const now = new Date();
  for (const deal of deals) {
    if (deal.stage === "sold") continue;
    for (const ms of (deal.milestones || [])) {
      if (ms.status === "completed" || ms.status === "skipped") continue;
      if (!ms.dueDate) continue;
      const due = new Date(ms.dueDate);
      const overdue = due < now;
      upcomingDeadlines.push({ deal: deal.name, dealId: deal.id, dealStage: deal.stage, milestone: ms.title, dueDate: ms.dueDate, status: ms.status, overdue });
      if (overdue) {
        overdueMilestones.push({ dealId: deal.id, dealName: deal.name, dealStage: deal.stage, title: ms.title, dueDate: ms.dueDate });
      }
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
    actionItems.push({ icon: "\u23F0", description: `Overdue: "${om.title}" on ${om.dealName} (due ${new Date(om.dueDate).toLocaleDateString("en-ZA", { day: "numeric", month: "short" })})`, link: route, color: theme.red });
  }
  for (const ba of budgetAlerts) {
    actionItems.push({ icon: "\uD83D\uDCB8", description: `${ba.dealName} at ${ba.pct}% of budget (${fmt(ba.actualSpend)} / ${fmt(ba.budget)})`, link: `/projects/${ba.dealId}`, color: theme.orange });
  }
  for (const sg of suggestions.filter((s) => s.type === "stage_advance")) {
    actionItems.push({ icon: "\uD83D\uDE80", description: sg.message, link: `/pipeline/${sg.dealId}`, color: theme.accent });
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
      <div style={{ ...styles.flexBetween, marginBottom: 24, paddingLeft: isMobile ? 48 : 0 }}>
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
      <div data-tour="quick-actions" style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {[
          { label: "\uFF0B New Deal", onClick: handleNewDeal, href: undefined as string | undefined },
          { label: "\uD83D\uDCDD Log Expense", onClick: undefined as (() => void) | undefined, href: "/projects" },
          { label: "\uD83D\uDCB3 Record Payment", onClick: undefined as (() => void) | undefined, href: "/invoices" },
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

      <KPIGrid metrics={metrics} avgDaysToSell={avgDaysToSell} isMobile={isMobile} />

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <PipelineFunnel deals={deals} router={router} isMobile={isMobile} />
        <CashFlowChart cashFlow={cashFlow} cfMax={cfMax} now={now} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <DeadlinesList upcomingDeadlines={upcomingDeadlines} router={router} />
        <ActiveProjects activeProjects={activeProjects} router={router} />
      </div>

      {/* Recent Deals */}
      <div style={styles.card}>
        <div style={{ ...styles.flexBetween, marginBottom: 12 }}>
          <h3 style={styles.sectionHeading as React.CSSProperties}>Recent Activity</h3>
          <button onClick={() => router.push("/pipeline")} style={styles.linkBtn as React.CSSProperties}>View all &rarr;</button>
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
                  <div style={{ ...styles.flexBetween, marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: theme.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, minWidth: 0 }}>{deal.name}</span>
                    <span style={{ fontSize: 8, fontWeight: 600, color: stageInfo?.color, background: `${stageInfo?.color}15`, padding: "2px 6px", borderRadius: 3, textTransform: "uppercase", flexShrink: 0, marginLeft: 6 }}>{stageInfo?.label}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <div>
                      <div style={{ fontSize: 9, color: theme.textDim }}>Profit</div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: m.estimatedProfit >= 0 ? theme.green : theme.red, ...styles.mono }}>{fmt(m.estimatedProfit)}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 9, color: theme.textDim }}>ROI</div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: m.estimatedRoi >= 0.15 ? theme.green : m.estimatedRoi >= 0 ? theme.orange : theme.red, ...styles.mono }}>{pct(m.estimatedRoi)}</div>
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

      <ActionItems actionItems={actionItems} router={router} />
      <ActivityTimeline timelineDeals={timelineDeals} timeAgo={timeAgo} router={router} />
    </div>
  );
}
