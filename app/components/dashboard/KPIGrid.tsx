"use client";
import { theme, fmt, pct, styles } from "../theme";

function KPICard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div style={{ ...styles.card, padding: 14 }}>
      <div style={{ fontSize: 9, color: theme.textDim, textTransform: "uppercase", letterSpacing: 0.6, fontWeight: 500, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color, ...styles.mono, marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</div>
      <div style={{ fontSize: 10, color: theme.textDim }}>{sub}</div>
    </div>
  );
}

interface KPIGridProps {
  metrics: {
    totalDeals: number;
    activeDeals: number;
    totalInvested: number;
    totalProjectedProfit: number;
    avgRoi: number;
    avgDaysInPipeline: number;
    renovatingDeals: number;
    totalActualExpenses: number;
    totalProjectedExpenses: number;
    totalActualProfit: number;
    soldDeals: number;
  };
  avgDaysToSell: number;
  isMobile: boolean;
}

export default function KPIGrid({ metrics, avgDaysToSell, isMobile }: KPIGridProps) {
  return (
    <>
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
    </>
  );
}
