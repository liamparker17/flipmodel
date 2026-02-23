"use client";
import { useState, useEffect } from "react";
import { theme, fmt } from "../../components/theme";
import { styles } from "../../components/theme";
import useDeals from "../../hooks/api/useApiDeals";
import { computeDealMetrics, getPortfolioMetrics, getCashFlowProjection, getExpensesByCategory, getMonthlyExpenses } from "../../utils/dealHelpers";
import FinanceOverview from "../../components/finance/FinanceOverview";
import ExpenseTable from "../../components/finance/ExpenseTable";
import CashFlowTab from "../../components/finance/CashFlowTab";
import PnLTab from "../../components/finance/PnLTab";
import BudgetTab from "../../components/finance/BudgetTab";

export default function FinancePage() {
  const { deals, loaded } = useDeals();
  const [isMobile, setIsMobile] = useState(false);
  const [view, setView] = useState<"overview" | "expenses" | "cashflow" | "pnl" | "budget">("overview");

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  if (!loaded) return <div style={{ padding: 40, color: theme.textDim }}>Loading...</div>;

  const metrics = getPortfolioMetrics(deals);
  const cashFlow = getCashFlowProjection(deals);
  const allExpenses = deals.flatMap((d: any) => (d.expenses || []).map((e: any) => ({ ...e, dealName: d.name })));
  const categoryBreakdown = getExpensesByCategory(allExpenses);
  const monthlyBreakdown = getMonthlyExpenses(allExpenses);

  // P&L by deal
  const dealPnL = deals.map((deal: any) => {
    const m = computeDealMetrics(deal);
    const actualExpenses = (deal.expenses || []).filter((e: any) => !e.isProjected).reduce((s: number, e: any) => s + e.amount, 0);
    const projectedExpenses = (deal.expenses || []).filter((e: any) => e.isProjected).reduce((s: number, e: any) => s + e.amount, 0);
    const actualSale = deal.actualSalePrice || 0;
    const expectedSale = deal.expectedSalePrice;
    const commission = (actualSale || expectedSale) * ((deal.data?.resale?.agentCommission || 5) / 100);
    const actualProfit = deal.stage === "sold" ? (actualSale - deal.purchasePrice - actualExpenses - commission) : 0;

    return {
      id: deal.id, name: deal.name, stage: deal.stage,
      purchasePrice: deal.purchasePrice,
      expectedSale, actualSale,
      renoEstimate: deal.data?.quickRenoEstimate || 0,
      actualExpenses, projectedExpenses, commission,
      estimatedProfit: m.estimatedProfit,
      actualProfit,
      roi: m.estimatedRoi,
    };
  });

  const totalPurchase = dealPnL.reduce((s: number, d: any) => s + d.purchasePrice, 0);
  const totalExpectedSale = dealPnL.reduce((s: number, d: any) => s + d.expectedSale, 0);
  const totalActualExpenses = allExpenses.filter((e: any) => !e.isProjected).reduce((s: number, e: any) => s + e.amount, 0);
  const totalProjectedExpenses = allExpenses.filter((e: any) => e.isProjected).reduce((s: number, e: any) => s + e.amount, 0);
  const totalEstProfit = dealPnL.reduce((s: number, d: any) => s + d.estimatedProfit, 0);
  const cfMax = Math.max(...cashFlow.map((m: any) => Math.max(m.inflow, m.outflow, 1)));

  return (
    <div style={{ padding: isMobile ? 16 : 28, maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, paddingLeft: isMobile ? 48 : 0, flexWrap: "wrap", gap: 8 }}>
        <div>
          <h1 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 600, margin: 0, color: theme.text }}>Finance</h1>
          <p style={{ fontSize: 12, color: theme.textDim, margin: "2px 0 0" }}>Portfolio financials and expense tracking</p>
        </div>
        {/* View tabs */}
        <div style={{ display: "flex", gap: 4 }}>
          {([{ key: "overview", label: "Overview" }, { key: "expenses", label: "Expenses" }, { key: "cashflow", label: "Cash Flow" }, { key: "pnl", label: "P&L" }, { key: "budget", label: "Budget" }] as const).map((v) => (
            <button key={v.key} onClick={() => setView(v.key)} style={{
              background: view === v.key ? theme.accent : "transparent", color: view === v.key ? "#000" : theme.textDim,
              border: view === v.key ? "none" : `1px solid ${theme.cardBorder}`, borderRadius: 6,
              padding: "5px 12px", fontSize: 11, fontWeight: view === v.key ? 600 : 400, cursor: "pointer", minHeight: 30,
            }}>{v.label}</button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
        <KPI label="Capital Deployed" value={fmt(totalPurchase)} color={theme.text} />
        <KPI label="Expected Returns" value={fmt(totalExpectedSale)} color={theme.accent} />
        <KPI label="Actual Spend" value={fmt(totalActualExpenses)} color={theme.orange} />
        <KPI label="Projected Spend" value={fmt(totalProjectedExpenses)} color={theme.textDim} />
        <KPI label="Expected Profit" value={fmt(totalEstProfit)} color={totalEstProfit >= 0 ? theme.green : theme.red} />
      </div>

      {view === "overview" && (
        <FinanceOverview
          dealPnL={dealPnL}
          totalPurchase={totalPurchase}
          totalActualExpenses={totalActualExpenses}
          totalExpectedSale={totalExpectedSale}
          totalEstProfit={totalEstProfit}
          avgRoi={metrics.avgRoi}
        />
      )}

      {view === "expenses" && (
        <ExpenseTable
          allExpenses={allExpenses}
          categoryBreakdown={categoryBreakdown}
          monthlyBreakdown={monthlyBreakdown}
          totalActualExpenses={totalActualExpenses}
          isMobile={isMobile}
        />
      )}

      {view === "cashflow" && (
        <CashFlowTab cashFlow={cashFlow} cfMax={cfMax} />
      )}

      {view === "pnl" && (
        <PnLTab dealPnL={dealPnL} />
      )}

      {view === "budget" && (
        <BudgetTab dealPnL={dealPnL} totalActualExpenses={totalActualExpenses} isMobile={isMobile} />
      )}
    </div>
  );
}

function KPI({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ ...styles.card as React.CSSProperties, padding: 14 }}>
      <div style={{ fontSize: 9, color: theme.textDim, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 500, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color, ...styles.mono as React.CSSProperties, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</div>
    </div>
  );
}
