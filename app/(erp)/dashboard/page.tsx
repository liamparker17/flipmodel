"use client";
import { useRouter } from "next/navigation";
import { theme, fmt, pct, styles } from "../../components/theme";
import TutorialCard from "../../components/TutorialCard";
import { useTutorial } from "../../components/TutorialProvider";
import useDeals from "../../hooks/api/useApiDeals";
import useIsMobile from "../../hooks/useIsMobile";
import useOrgContext from "../../hooks/useOrgContext";
import { DEAL_STAGES, computeDealMetrics, getPortfolioMetrics, getCashFlowProjection, getDealProgress } from "../../utils/dealHelpers";
import { generateSuggestions } from "../../lib/automation";
import { BUDGET_ALERT_THRESHOLD } from "@/lib/constants";
import KPIGrid from "../../components/dashboard/KPIGrid";
import PipelineFunnel from "../../components/dashboard/PipelineFunnel";
import CashFlowChart from "../../components/dashboard/CashFlowChart";
import DeadlinesList from "../../components/dashboard/DeadlinesList";
import ActiveProjects from "../../components/dashboard/ActiveProjects";
import ActionItems from "../../components/dashboard/ActionItems";
import ActivityTimeline from "../../components/dashboard/ActivityTimeline";
import type { OrgRole } from "@/types/org";

/* ─── Inline KPI card (reusable across role views) ─── */
function KPICard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div style={{ ...styles.card, padding: 14 }}>
      <div style={{ fontSize: 9, color: theme.textDim, textTransform: "uppercase", letterSpacing: 0.6, fontWeight: 500, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color, ...styles.mono, marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</div>
      <div style={{ fontSize: 10, color: theme.textDim }}>{sub}</div>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { deals, loaded, createDeal, toggleTask } = useDeals();
  const isMobile = useIsMobile();
  const { role } = useOrgContext();
  const { tutorialActive, tutorialStep, advanceStep, setTutorialError } = useTutorial();

  if (!loaded) return <div style={{ padding: 40, color: theme.textDim }} role="status" aria-live="polite">Loading...</div>;

  const effectiveRole: OrgRole = role || "executive";
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-ZA", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const shortDate = now.toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });

  // ─── Shared data computations ───
  const metrics = getPortfolioMetrics(deals);
  const cashFlow = getCashFlowProjection(deals);
  const recentDeals = [...deals].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 6);
  const activeProjects = deals.filter((d) => d.stage === "purchased" || d.stage === "renovating");

  // Single pass: upcoming deadlines + overdue milestones
  const upcomingDeadlines: { deal: string; dealId: string; dealStage: string; milestone: string; dueDate: string; status: string; overdue: boolean }[] = [];
  const overdueMilestones: { dealId: string; dealName: string; dealStage: string; title: string; dueDate: string }[] = [];
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

  // Deal velocity
  const soldDeals = deals.filter((d) => d.stage === "sold" && d.soldDate && d.createdAt);
  const avgDaysToSell = soldDeals.length > 0
    ? Math.round(soldDeals.reduce((s, d) => s + Math.floor((new Date(d.soldDate!).getTime() - new Date(d.createdAt).getTime()) / (1000 * 60 * 60 * 24)), 0) / soldDeals.length)
    : 0;

  // Cash flow chart max value
  const cfMax = Math.max(...cashFlow.map((m) => Math.max(Math.abs(m.inflow), Math.abs(m.outflow), 1)));

  // Action items
  const suggestions = generateSuggestions(deals);
  const budgetAlerts: { dealId: string; dealName: string; actualSpend: number; budget: number; pct: number }[] = [];
  for (const deal of deals) {
    const actualExpenses = (deal.expenses || []).filter((e) => !e.isProjected).reduce((s, e) => s + e.amount, 0);
    const budget = deal.data?.quickRenoEstimate || 0;
    if (budget > 0 && actualExpenses > budget * BUDGET_ALERT_THRESHOLD) {
      budgetAlerts.push({ dealId: deal.id, dealName: deal.name, actualSpend: actualExpenses, budget, pct: Math.round((actualExpenses / budget) * 100) });
    }
  }

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

  // Activity timeline
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

  const handleNewDeal = async () => {
    try {
      const deal = await createDeal("New Property");
      if (tutorialActive && tutorialStep === 2) {
        advanceStep();
      }
      router.push(`/pipeline/${deal.id}`);
    } catch (err) {
      if (tutorialActive) {
        setTutorialError("Something went wrong creating the deal. Try again or skip the tutorial.");
      }
    }
  };

  // ─── Finance-specific computations ───
  const totalOutstanding = deals.reduce((sum, d) => {
    const invoiceTotal = (d.expenses || []).filter((e) => e.isProjected).reduce((s, e) => s + e.amount, 0);
    return sum + invoiceTotal;
  }, 0);
  const totalExpenses = deals.reduce((sum, d) => {
    return sum + (d.expenses || []).filter((e) => !e.isProjected).reduce((s, e) => s + e.amount, 0);
  }, 0);
  const projectedRevenue = deals.filter((d) => d.stage !== "sold").reduce((sum, d) => sum + (d.expectedSalePrice || 0), 0);
  const cashPosition = projectedRevenue - metrics.totalActualExpenses - metrics.totalProjectedExpenses;

  // ─── PM-specific computations ───
  const tasksDueThisWeek = (() => {
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() + (7 - weekEnd.getDay()));
    let count = 0;
    for (const deal of deals) {
      for (const ms of (deal.milestones || [])) {
        if (ms.dueDate && ms.status !== "completed" && ms.status !== "skipped") {
          const due = new Date(ms.dueDate);
          if (due >= now && due <= weekEnd) count++;
        }
        for (const t of (ms.tasks || [])) {
          if (!t.completed && t.dueDate) {
            const due = new Date(t.dueDate);
            if (due >= now && due <= weekEnd) count++;
          }
        }
      }
    }
    return count;
  })();

  const projectsWithinBudget = activeProjects.filter((d) => {
    const actual = (d.expenses || []).filter((e) => !e.isProjected).reduce((s, e) => s + e.amount, 0);
    const budget = d.data?.quickRenoEstimate || 0;
    return budget === 0 || actual <= budget;
  }).length;
  const budgetHealthPct = activeProjects.length > 0 ? Math.round((projectsWithinBudget / activeProjects.length) * 100) : 100;

  // ─── Field worker task count ───
  const todaysTasks = (() => {
    let count = 0;
    const todayStr = now.toISOString().slice(0, 10);
    for (const deal of activeProjects) {
      for (const ms of (deal.milestones || [])) {
        for (const t of (ms.tasks || [])) {
          if (!t.completed) {
            if (t.dueDate && t.dueDate.slice(0, 10) === todayStr) count++;
            else if (!t.dueDate) count++; // uncompleted tasks without a date count as "today"
          }
        }
      }
    }
    return count;
  })();

  // ─── Quick action button helper ───
  const QuickAction = ({ label, onClick, href }: { label: string; onClick?: () => void; href?: string }) => (
    <button
      onClick={onClick || (() => router.push(href!))}
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
      {label}
    </button>
  );

  // ─── Recent Activity section (shared) ───
  const RecentActivitySection = () => (
    <div style={styles.card} role="region" aria-label="Recent activity">
      <div style={{ ...styles.flexBetween, marginBottom: 12 }}>
        <h3 style={styles.sectionHeading as React.CSSProperties}>Recent Activity</h3>
        <button onClick={() => router.push("/pipeline")} aria-label="View all recent activity" style={styles.linkBtn as React.CSSProperties}>View all &rarr;</button>
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
              <div key={deal.id} onClick={() => router.push(`/pipeline/${deal.id}`)} role="button" tabIndex={0} aria-label={`${deal.name} - ${stageInfo?.label || deal.stage}`} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") router.push(`/pipeline/${deal.id}`); }} style={{
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
  );

  // ═══════════════════════════════════════════════════════════
  //  EXECUTIVE (default)
  // ═══════════════════════════════════════════════════════════
  if (effectiveRole === "executive") {
    return (
      <div style={{ padding: isMobile ? 16 : 28, maxWidth: 1400, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ ...styles.flexBetween, marginBottom: 24, paddingLeft: isMobile ? 48 : 0 }}>
          <div>
            <h1 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 600, margin: 0, color: theme.text }}>Portfolio Overview</h1>
            <p style={{ fontSize: 12, color: theme.textDim, margin: "2px 0 0" }}>Portfolio overview &middot; {dateStr}</p>
          </div>
          <button onClick={handleNewDeal} aria-label="Create new property" style={{
            background: theme.accent, color: "#fff", border: "none", borderRadius: 6,
            padding: "8px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer", minHeight: 36,
          }}>+ New Property</button>
        </div>

        {/* Quick Actions Bar */}
        <div data-tour="quick-actions" role="toolbar" aria-label="Quick actions" style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          <QuickAction label={"\uFF0B New Deal"} onClick={handleNewDeal} />
          <QuickAction label={"\uD83D\uDCDD Log Expense"} href="/projects" />
          <QuickAction label={"\uD83D\uDCB3 Record Payment"} href="/invoices" />
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

        <RecentActivitySection />
        <ActionItems actionItems={actionItems} router={router} />
        <ActivityTimeline timelineDeals={timelineDeals} timeAgo={timeAgo} router={router} />
        <TutorialCard page="dashboard" />
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════
  //  FINANCE MANAGER
  // ═══════════════════════════════════════════════════════════
  if (effectiveRole === "finance_manager") {
    // Finance-specific action items: overdue + budget alerts only
    const financeActionItems = actionItems.filter(
      (item) => item.color === theme.red || item.color === theme.orange
    );

    return (
      <div style={{ padding: isMobile ? 16 : 28, maxWidth: 1400, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ ...styles.flexBetween, marginBottom: 24, paddingLeft: isMobile ? 48 : 0 }}>
          <div>
            <h1 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 600, margin: 0, color: theme.text }}>Finance Dashboard</h1>
            <p style={{ fontSize: 12, color: theme.textDim, margin: "2px 0 0" }}>Financial overview &middot; {dateStr}</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div data-tour="quick-actions" role="toolbar" aria-label="Quick actions" style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          <QuickAction label={"\uD83D\uDCCB New Invoice"} href="/invoices" />
          <QuickAction label={"\uD83D\uDCB3 Record Payment"} href="/invoices" />
          <QuickAction label={"\uD83D\uDCCA View Reports"} href="/reports" />
        </div>

        {/* Finance KPIs */}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
          <KPICard
            label="Total Outstanding"
            value={fmt(totalOutstanding)}
            sub="Unpaid invoices"
            color={theme.orange}
          />
          <KPICard
            label="Total Expenses"
            value={fmt(totalExpenses)}
            sub="All recorded expenses"
            color={theme.red}
          />
          <KPICard
            label="Projected Revenue"
            value={fmt(projectedRevenue)}
            sub="Expected sale prices"
            color={theme.green}
          />
          <KPICard
            label="Cash Position"
            value={fmt(cashPosition)}
            sub="Revenue - costs"
            color={cashPosition >= 0 ? theme.green : theme.red}
          />
        </div>

        {/* Two columns: Action Items + Deadlines */}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16, marginBottom: 16 }}>
          <div>
            <ActionItems actionItems={financeActionItems} router={router} />
          </div>
          <DeadlinesList upcomingDeadlines={upcomingDeadlines} router={router} />
        </div>

        {/* Recent Activity */}
        <RecentActivitySection />
        <TutorialCard page="dashboard" />
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════
  //  PROJECT MANAGER
  // ═══════════════════════════════════════════════════════════
  if (effectiveRole === "project_manager") {
    return (
      <div style={{ padding: isMobile ? 16 : 28, maxWidth: 1400, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ ...styles.flexBetween, marginBottom: 24, paddingLeft: isMobile ? 48 : 0 }}>
          <div>
            <h1 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 600, margin: 0, color: theme.text }}>My Projects</h1>
            <p style={{ fontSize: 12, color: theme.textDim, margin: "2px 0 0" }}>{activeProjects.length} active project{activeProjects.length !== 1 ? "s" : ""} &middot; {dateStr}</p>
          </div>
          <button onClick={handleNewDeal} aria-label="Create new property" style={{
            background: theme.accent, color: "#fff", border: "none", borderRadius: 6,
            padding: "8px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer", minHeight: 36,
          }}>+ New Property</button>
        </div>

        {/* Quick Actions */}
        <div data-tour="quick-actions" role="toolbar" aria-label="Quick actions" style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          <QuickAction label={"\uFF0B New Property"} onClick={handleNewDeal} />
          <QuickAction label={"\uD83D\uDC64 Assign Task"} href="/projects" />
          <QuickAction label={"\uD83D\uDCE6 Order Materials"} href="/purchase-orders" />
        </div>

        {/* PM KPIs */}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
          <KPICard
            label="Active Projects"
            value={String(activeProjects.length)}
            sub="Purchased + Renovating"
            color={theme.accent}
          />
          <KPICard
            label="Tasks Due This Week"
            value={String(tasksDueThisWeek)}
            sub="Milestones & tasks"
            color={tasksDueThisWeek > 0 ? theme.orange : theme.green}
          />
          <KPICard
            label="Budget Health"
            value={`${budgetHealthPct}%`}
            sub="Projects within budget"
            color={budgetHealthPct >= 80 ? theme.green : budgetHealthPct >= 50 ? theme.orange : theme.red}
          />
          <KPICard
            label="Overdue Milestones"
            value={String(overdueMilestones.length)}
            sub={overdueMilestones.length === 0 ? "All on track" : "Needs attention"}
            color={overdueMilestones.length === 0 ? theme.green : theme.red}
          />
        </div>

        {/* Active Projects (full width) */}
        <div style={{ marginBottom: 16 }}>
          <ActiveProjects activeProjects={activeProjects} router={router} />
        </div>

        {/* Two columns: Deadlines + Action Items */}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16, marginBottom: 16 }}>
          <DeadlinesList upcomingDeadlines={upcomingDeadlines} router={router} />
          <ActionItems actionItems={actionItems} router={router} />
        </div>

        {/* Activity Timeline */}
        <ActivityTimeline timelineDeals={timelineDeals} timeAgo={timeAgo} router={router} />
        <TutorialCard page="dashboard" />
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════
  //  SITE SUPERVISOR
  // ═══════════════════════════════════════════════════════════
  if (effectiveRole === "site_supervisor") {
    const siteCount = activeProjects.length;
    const siteName = siteCount === 1 ? activeProjects[0].name : undefined;

    // Count today's tasks across supervised projects
    const todayStr = now.toISOString().slice(0, 10);
    let supervisorTodayTasks = 0;
    for (const deal of activeProjects) {
      for (const ms of (deal.milestones || [])) {
        for (const t of (ms.tasks || [])) {
          if (!t.completed) {
            if (t.dueDate && t.dueDate.slice(0, 10) === todayStr) supervisorTodayTasks++;
            else if (!t.dueDate && ms.status !== "completed" && ms.status !== "skipped") supervisorTodayTasks++;
          }
        }
      }
    }

    // Only overdue deadlines for site supervisor
    const overdueDeadlines = upcomingDeadlines.filter((d) => d.overdue);
    const nonOverdueDeadlines = upcomingDeadlines.filter((d) => !d.overdue);
    const supervisorDeadlines = [...overdueDeadlines, ...nonOverdueDeadlines];

    return (
      <div style={{ padding: isMobile ? 12 : 28, maxWidth: 1000, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: 20, paddingLeft: isMobile ? 48 : 0 }}>
          <h1 style={{ fontSize: isMobile ? 22 : 26, fontWeight: 700, margin: 0, color: theme.text }}>Today&apos;s Work</h1>
          <p style={{ fontSize: 13, color: theme.textDim, margin: "4px 0 0" }}>
            {siteName || `${siteCount} active site${siteCount !== 1 ? "s" : ""}`} &middot; {dateStr}
          </p>
        </div>

        {/* Today's summary card */}
        <div style={{
          ...styles.card,
          padding: isMobile ? 20 : 24,
          marginBottom: 16,
          background: theme.card,
          borderLeft: `4px solid ${theme.accent}`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div>
              <div style={{ fontSize: 36, fontWeight: 800, color: theme.accent, ...styles.mono, lineHeight: 1 }}>{supervisorTodayTasks}</div>
              <div style={{ fontSize: 12, color: theme.textDim, marginTop: 4 }}>task{supervisorTodayTasks !== 1 ? "s" : ""} today</div>
            </div>
            <div style={{ width: 1, height: 48, background: theme.cardBorder }} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: theme.text }}>{siteCount} active site{siteCount !== 1 ? "s" : ""}</div>
              {overdueDeadlines.length > 0 && (
                <div style={{ fontSize: 12, color: theme.red, fontWeight: 600, marginTop: 2 }}>
                  {overdueDeadlines.length} overdue milestone{overdueDeadlines.length !== 1 ? "s" : ""}
                </div>
              )}
              {budgetAlerts.length > 0 && (
                <div style={{ fontSize: 12, color: theme.orange, fontWeight: 600, marginTop: 2 }}>
                  {budgetAlerts.length} budget alert{budgetAlerts.length !== 1 ? "s" : ""}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Active Projects (simplified, larger tap targets) */}
        <div style={{ marginBottom: 16 }}>
          <ActiveProjects activeProjects={activeProjects} router={router} />
        </div>

        {/* Deadlines (overdue highlighted first) */}
        <div style={{ marginBottom: 16 }}>
          <DeadlinesList upcomingDeadlines={supervisorDeadlines} router={router} />
        </div>

        {/* Action Items */}
        <ActionItems actionItems={actionItems} router={router} />
        <TutorialCard page="dashboard" />
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════
  //  FIELD WORKER
  // ═══════════════════════════════════════════════════════════
  if (effectiveRole === "field_worker") {
    // Collect all incomplete tasks across active projects
    const allTasks: { id: string; title: string; completed: boolean; dealName: string; dealId: string; dueDate?: string; milestoneId: string; milestoneName: string; address?: string }[] = [];
    for (const deal of activeProjects) {
      const address = deal.address || deal.name;
      for (const ms of (deal.milestones || [])) {
        if (ms.status === "completed" || ms.status === "skipped") continue;
        for (const t of (ms.tasks || [])) {
          if (!t.completed) {
            allTasks.push({
              id: t.id || `${deal.id}-${ms.title}-${t.title}`,
              title: t.title,
              completed: t.completed,
              dealName: deal.name,
              dealId: deal.id,
              dueDate: t.dueDate,
              milestoneId: ms.id,
              milestoneName: ms.title,
              address: typeof address === "string" ? address : deal.name,
            });
          }
        }
      }
    }

    // Sort: tasks with today's due date first, then by due date, then undated
    const todayStr = now.toISOString().slice(0, 10);
    allTasks.sort((a, b) => {
      const aToday = a.dueDate?.slice(0, 10) === todayStr ? 0 : 1;
      const bToday = b.dueDate?.slice(0, 10) === todayStr ? 0 : 1;
      if (aToday !== bToday) return aToday - bToday;
      if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return 0;
    });

    return (
      <div style={{ padding: isMobile ? 12 : 28, maxWidth: 600, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: 20, paddingLeft: isMobile ? 48 : 0 }}>
          <h1 style={{ fontSize: isMobile ? 24 : 28, fontWeight: 700, margin: 0, color: theme.text }}>My Day</h1>
          <p style={{ fontSize: 13, color: theme.textDim, margin: "4px 0 0" }}>{dateStr}</p>
        </div>

        {/* Big task count */}
        <div style={{
          ...styles.card,
          padding: isMobile ? 24 : 28,
          marginBottom: 20,
          textAlign: "center",
          borderLeft: `4px solid ${theme.accent}`,
        }}>
          <div style={{ fontSize: 48, fontWeight: 800, color: theme.accent, ...styles.mono, lineHeight: 1 }}>{allTasks.length}</div>
          <div style={{ fontSize: 16, color: theme.textDim, marginTop: 8 }}>
            task{allTasks.length !== 1 ? "s" : ""} today
          </div>
        </div>

        {/* Task list */}
        {allTasks.length === 0 ? (
          <div style={{ ...styles.card, padding: 24, textAlign: "center" }}>
            <p style={{ fontSize: 14, color: theme.textDim, margin: 0 }}>No tasks assigned. Enjoy your day!</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
            {allTasks.map((task) => (
              <div
                key={task.id}
                onClick={() => router.push(`/projects/${task.dealId}`)}
                role="button"
                tabIndex={0}
                aria-label={`Task: ${task.title} at ${task.address}`}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") router.push(`/projects/${task.dealId}`); }}
                style={{
                  ...styles.card,
                  padding: isMobile ? 16 : 14,
                  cursor: "pointer",
                  borderLeft: `4px solid ${task.dueDate && task.dueDate.slice(0, 10) < todayStr ? theme.red : theme.accent}`,
                  minHeight: isMobile ? 56 : 48,
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                {/* Checkbox — completes task on click */}
                <div
                  role="checkbox"
                  aria-checked={false}
                  aria-label={`Mark "${task.title}" as complete`}
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleTask(task.dealId, task.milestoneId, task.id);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.stopPropagation();
                      e.preventDefault();
                      toggleTask(task.dealId, task.milestoneId, task.id);
                    }
                  }}
                  style={{
                    width: isMobile ? 28 : 22,
                    height: isMobile ? 28 : 22,
                    borderRadius: 4,
                    border: `2px solid ${theme.accent}`,
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    transition: "background 0.15s",
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: isMobile ? 14 : 13, fontWeight: 600, color: theme.text, marginBottom: 2 }}>{task.title}</div>
                  <div style={{ fontSize: isMobile ? 12 : 11, color: theme.textDim, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {task.address} &middot; {task.milestoneName}
                  </div>
                </div>
                {task.dueDate && (
                  <div style={{
                    fontSize: isMobile ? 11 : 10,
                    fontWeight: 600,
                    color: task.dueDate.slice(0, 10) < todayStr ? theme.red : task.dueDate.slice(0, 10) === todayStr ? theme.accent : theme.textDim,
                    ...styles.mono,
                    flexShrink: 0,
                  }}>
                    {task.dueDate.slice(0, 10) === todayStr
                      ? "Today"
                      : new Date(task.dueDate).toLocaleDateString("en-ZA", { day: "numeric", month: "short" })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Quick link to tools */}
        <div
          onClick={() => router.push("/tools")}
          role="button"
          tabIndex={0}
          aria-label="View checked out tools"
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") router.push("/tools"); }}
          style={{
            ...styles.card,
            padding: isMobile ? 16 : 14,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 12,
            minHeight: isMobile ? 56 : 48,
          }}
        >
          <span style={{ fontSize: isMobile ? 22 : 18 }}>{"\uD83D\uDEE0\uFE0F"}</span>
          <div>
            <div style={{ fontSize: isMobile ? 14 : 13, fontWeight: 600, color: theme.text }}>My Tools</div>
            <div style={{ fontSize: isMobile ? 12 : 11, color: theme.textDim }}>View checked-out tools and equipment</div>
          </div>
          <span style={{ marginLeft: "auto", color: theme.textDim, fontSize: 14 }}>&rarr;</span>
        </div>
        <TutorialCard page="dashboard" />
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════
  //  VIEWER
  // ═══════════════════════════════════════════════════════════
  if (effectiveRole === "viewer") {
    const totalInvested = metrics.totalInvested;
    const currentValue = deals.reduce((sum, d) => {
      if (d.stage === "sold") return sum + (d.actualSalePrice || 0);
      return sum + (d.expectedSalePrice || d.purchasePrice || 0);
    }, 0);
    const projectedReturns = currentValue - totalInvested;

    return (
      <div style={{ padding: isMobile ? 16 : 28, maxWidth: 1400, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: 24, paddingLeft: isMobile ? 48 : 0 }}>
          <h1 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 600, margin: 0, color: theme.text }}>Investment Overview</h1>
          <p style={{ fontSize: 12, color: theme.textDim, margin: "2px 0 0" }}>Portfolio overview &middot; {dateStr}</p>
        </div>

        {/* Viewer KPIs */}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
          <KPICard
            label="Total Invested"
            value={fmt(totalInvested)}
            sub="Capital deployed"
            color={theme.text}
          />
          <KPICard
            label="Current Portfolio Value"
            value={fmt(currentValue)}
            sub="Expected sale values"
            color={theme.accent}
          />
          <KPICard
            label="Projected Returns"
            value={fmt(projectedReturns)}
            sub={totalInvested > 0 ? `${pct(projectedReturns / totalInvested)} ROI` : "No investments yet"}
            color={projectedReturns >= 0 ? theme.green : theme.red}
          />
          <KPICard
            label="Active Deals"
            value={String(metrics.activeDeals)}
            sub={`${metrics.totalDeals} total properties`}
            color={theme.accent}
          />
        </div>

        {/* Pipeline Funnel (read-only) */}
        <div style={{ marginBottom: 16 }}>
          <PipelineFunnel deals={deals} router={router} isMobile={isMobile} />
        </div>

        {/* Active Projects (read-only, simplified) */}
        <ActiveProjects activeProjects={activeProjects} router={router} />
        <TutorialCard page="dashboard" />
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════
  //  FALLBACK (same as executive)
  // ═══════════════════════════════════════════════════════════
  return (
    <div style={{ padding: isMobile ? 16 : 28, maxWidth: 1400, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ ...styles.flexBetween, marginBottom: 24, paddingLeft: isMobile ? 48 : 0 }}>
        <div>
          <h1 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 600, margin: 0, color: theme.text }}>Dashboard</h1>
          <p style={{ fontSize: 12, color: theme.textDim, margin: "2px 0 0" }}>Portfolio overview &middot; {dateStr}</p>
        </div>
        <button onClick={handleNewDeal} aria-label="Create new property" style={{
          background: theme.accent, color: "#fff", border: "none", borderRadius: 6,
          padding: "8px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer", minHeight: 36,
        }}>+ New Property</button>
      </div>

      <div data-tour="quick-actions" role="toolbar" aria-label="Quick actions" style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <QuickAction label={"\uFF0B New Deal"} onClick={handleNewDeal} />
        <QuickAction label={"\uD83D\uDCDD Log Expense"} href="/projects" />
        <QuickAction label={"\uD83D\uDCB3 Record Payment"} href="/invoices" />
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

      <RecentActivitySection />
      <ActionItems actionItems={actionItems} router={router} />
      <ActivityTimeline timelineDeals={timelineDeals} timeAgo={timeAgo} router={router} />
      <TutorialCard page="dashboard" />
    </div>
  );
}
