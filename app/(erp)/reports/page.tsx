"use client";
import { useState, useEffect } from "react";
import { theme, fmt, pct, styles } from "../../components/theme";
import useDeals from "../../hooks/api/useApiDeals";
import { DEAL_STAGES, computeDealMetrics, getPortfolioMetrics, getStageIndex, getDealProgress, getExpensesByCategory } from "../../utils/dealHelpers";

export default function ReportsPage() {
  const { deals, loaded } = useDeals();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  if (!loaded) return <div style={{ padding: 40, color: theme.textDim }}>Loading...</div>;

  const metrics = getPortfolioMetrics(deals);
  const soldDeals = deals.filter((d) => d.stage === "sold");

  // Deal velocity: how fast deals move through stages
  const dealVelocity = deals.map((deal) => {
    const created = new Date(deal.createdAt).getTime();
    const updated = new Date(deal.updatedAt).getTime();
    const daysActive = Math.floor((Date.now() - created) / (1000 * 60 * 60 * 24));
    const stageIdx = getStageIndex(deal.stage);
    const velocity = stageIdx > 0 ? daysActive / stageIdx : daysActive;
    return { deal, daysActive, stageIdx, velocity, daysPerStage: velocity };
  }).sort((a, b) => a.velocity - b.velocity);

  const avgVelocity = dealVelocity.length > 0
    ? Math.round(dealVelocity.reduce((s, d) => s + d.daysPerStage, 0) / dealVelocity.length)
    : 0;

  // Conversion funnel
  const funnel = DEAL_STAGES.map((stage, i) => {
    const count = deals.filter((d) => getStageIndex(d.stage) >= i).length;
    const pctOfTotal = deals.length > 0 ? (count / deals.length) * 100 : 0;
    return { ...stage, count, pct: pctOfTotal };
  });

  // ROI distribution
  const roiGroups = { negative: 0, low: 0, medium: 0, high: 0, excellent: 0 };
  for (const deal of deals) {
    const m = computeDealMetrics(deal);
    if (m.estimatedRoi < 0) roiGroups.negative++;
    else if (m.estimatedRoi < 0.10) roiGroups.low++;
    else if (m.estimatedRoi < 0.20) roiGroups.medium++;
    else if (m.estimatedRoi < 0.35) roiGroups.high++;
    else roiGroups.excellent++;
  }

  // Sold deals performance
  const soldPerformance = soldDeals.map((deal) => {
    const actualSale = deal.actualSalePrice || deal.expectedSalePrice;
    const actualExpenses = (deal.expenses || []).filter((e) => !e.isProjected).reduce((s, e) => s + e.amount, 0);
    const commission = actualSale * ((deal.data?.resale?.agentCommission || 5) / 100);
    const actualProfit = actualSale - deal.purchasePrice - actualExpenses - commission;
    const roi = deal.purchasePrice > 0 ? actualProfit / deal.purchasePrice : 0;
    const daysToSell = deal.soldDate ? Math.floor((new Date(deal.soldDate).getTime() - new Date(deal.createdAt).getTime()) / (1000 * 60 * 60 * 24)) : 0;

    return {
      name: deal.name,
      purchasePrice: deal.purchasePrice,
      salePrice: actualSale,
      profit: actualProfit,
      roi,
      daysToSell,
      aboveAsking: deal.actualSalePrice && deal.expectedSalePrice ? deal.actualSalePrice - deal.expectedSalePrice : 0,
    };
  });

  const avgSoldProfit = soldPerformance.length > 0 ? soldPerformance.reduce((s, d) => s + d.profit, 0) / soldPerformance.length : 0;
  const avgSoldRoi = soldPerformance.length > 0 ? soldPerformance.reduce((s, d) => s + d.roi, 0) / soldPerformance.length : 0;
  const avgDaysToSell = soldPerformance.length > 0 ? Math.round(soldPerformance.reduce((s, d) => s + d.daysToSell, 0) / soldPerformance.length) : 0;

  // Expense analysis across all deals
  const allExpenses = deals.flatMap((d) => d.expenses || []);
  const expenseCategories = getExpensesByCategory(allExpenses.filter((e) => !e.isProjected));
  const totalActualExpenses = allExpenses.filter((e) => !e.isProjected).reduce((s, e) => s + e.amount, 0);

  // Pipeline stage breakdown
  const stageBreakdown = DEAL_STAGES.map((stage) => {
    const stageDeals = deals.filter((d) => d.stage === stage.key);
    let totalValue = 0;
    let totalProfit = 0;
    for (const d of stageDeals) {
      const m = computeDealMetrics(d);
      totalValue += m.purchasePrice;
      totalProfit += m.estimatedProfit;
    }
    return { ...stage, count: stageDeals.length, totalValue, totalProfit };
  });

  return (
    <div style={{ padding: isMobile ? 16 : 28, maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ marginBottom: 24, paddingLeft: isMobile ? 48 : 0 }}>
        <h1 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 600, margin: 0, color: theme.text }}>Reports & Analytics</h1>
        <p style={{ fontSize: 12, color: theme.textDim, margin: "2px 0 0" }}>Portfolio performance, deal velocity, and insights</p>
      </div>

      {/* Top-level KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
        <KPI label="Total Deals" value={String(deals.length)} sub={`${metrics.activeDeals} active, ${metrics.soldDeals} sold`} color={theme.accent} />
        <KPI label="Portfolio ROI" value={pct(metrics.avgRoi)} sub="Average across deals" color={metrics.avgRoi >= 0.15 ? theme.green : theme.orange} />
        <KPI label="Avg Days/Stage" value={avgVelocity > 0 ? `${avgVelocity}d` : "—"} sub="Deal velocity" color={theme.accent} />
        <KPI label="Realized Profit" value={fmt(metrics.totalActualProfit)} sub={`${metrics.soldDeals} completed flip${metrics.soldDeals !== 1 ? "s" : ""}`} color={metrics.totalActualProfit >= 0 ? theme.green : theme.red} />
        <KPI label="Avg Time to Sell" value={avgDaysToSell > 0 ? `${avgDaysToSell}d` : "—"} sub="From lead to sold" color={theme.accent} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16, marginBottom: 16 }}>
        {/* Conversion Funnel */}
        <div style={styles.card}>
          <h3 style={{ ...styles.sectionHeading, margin: "0 0 12px" }}>Pipeline Conversion Funnel</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {funnel.map((stage) => (
              <div key={stage.key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 80, fontSize: 10, color: stage.color, fontWeight: 600 }}>{stage.label}</div>
                <div style={{ flex: 1, height: 20, background: theme.input, borderRadius: 4, overflow: "hidden", position: "relative" }}>
                  <div style={{
                    height: "100%", width: `${stage.pct}%`, background: stage.color, borderRadius: 4, opacity: 0.6,
                    transition: "width 0.4s", minWidth: stage.count > 0 ? 4 : 0,
                  }} />
                </div>
                <div style={{ width: 24, fontSize: 12, fontWeight: 700, color: stage.color, textAlign: "right", fontFamily: "'JetBrains Mono', monospace" }}>{stage.count}</div>
                <div style={{ width: 30, fontSize: 10, color: theme.textDim, textAlign: "right" }}>{Math.round(stage.pct)}%</div>
              </div>
            ))}
          </div>
        </div>

        {/* ROI Distribution */}
        <div style={styles.card}>
          <h3 style={{ ...styles.sectionHeading, margin: "0 0 12px" }}>ROI Distribution</h3>
          {deals.length === 0 ? (
            <div style={{ fontSize: 12, color: theme.textDim }}>No deals to analyze.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {[
                { label: "Negative (<0%)", value: roiGroups.negative, color: theme.red },
                { label: "Low (0-10%)", value: roiGroups.low, color: theme.orange },
                { label: "Medium (10-20%)", value: roiGroups.medium, color: "#FBBF24" },
                { label: "High (20-35%)", value: roiGroups.high, color: theme.green },
                { label: "Excellent (35%+)", value: roiGroups.excellent, color: "#22D3EE" },
              ].map((group) => (
                <div key={group.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 100, fontSize: 10, color: theme.textDim }}>{group.label}</div>
                  <div style={{ flex: 1, height: 16, background: theme.input, borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${(group.value / deals.length) * 100}%`, background: group.color, borderRadius: 3, opacity: 0.7, minWidth: group.value > 0 ? 4 : 0 }} />
                  </div>
                  <div style={{ width: 20, fontSize: 12, fontWeight: 700, color: group.color, textAlign: "right", fontFamily: "'JetBrains Mono', monospace" }}>{group.value}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16, marginBottom: 16 }}>
        {/* Deal Velocity */}
        <div style={styles.card}>
          <h3 style={{ ...styles.sectionHeading, margin: "0 0 12px" }}>Deal Velocity (Days per Stage)</h3>
          {dealVelocity.length === 0 ? (
            <div style={{ fontSize: 12, color: theme.textDim }}>No active deals.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {dealVelocity.slice(0, 10).map(({ deal, daysActive, daysPerStage }) => {
                const stageInfo = DEAL_STAGES.find((s) => s.key === deal.stage);
                const maxDays = Math.max(...dealVelocity.map((d) => d.daysPerStage), 1);
                return (
                  <div key={deal.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0" }}>
                    <div style={{ width: 100, fontSize: 11, color: theme.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{deal.name}</div>
                    <div style={{ flex: 1, height: 6, background: theme.input, borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${(daysPerStage / maxDays) * 100}%`, background: daysPerStage < 20 ? theme.green : daysPerStage < 40 ? theme.orange : theme.red, borderRadius: 3, opacity: 0.7 }} />
                    </div>
                    <div style={{ width: 40, fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: theme.text, textAlign: "right" }}>{Math.round(daysPerStage)}d</div>
                    <span style={{ fontSize: 8, color: stageInfo?.color, background: `${stageInfo?.color}15`, padding: "1px 4px", borderRadius: 2, textTransform: "uppercase" }}>{stageInfo?.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Expense Categories */}
        <div style={styles.card}>
          <h3 style={{ ...styles.sectionHeading, margin: "0 0 12px" }}>Portfolio Expense Breakdown</h3>
          {expenseCategories.length === 0 ? (
            <div style={{ fontSize: 12, color: theme.textDim }}>No expenses recorded.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {expenseCategories.map((cat) => (
                <div key={cat.category} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: cat.color, flexShrink: 0 }} />
                  <div style={{ width: 100, fontSize: 10, color: theme.text }}>{cat.label}</div>
                  <div style={{ flex: 1, height: 8, background: theme.input, borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${(cat.actual / (totalActualExpenses || 1)) * 100}%`, background: cat.color, borderRadius: 4, opacity: 0.7 }} />
                  </div>
                  <div style={{ width: 80, fontSize: 10, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", color: theme.text, textAlign: "right" }}>{fmt(cat.actual)}</div>
                  <div style={{ width: 30, fontSize: 9, color: theme.textDim, textAlign: "right" }}>{Math.round((cat.actual / (totalActualExpenses || 1)) * 100)}%</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sold Deals Performance */}
      {soldPerformance.length > 0 && (
        <div style={styles.cardMb}>
          <h3 style={{ ...styles.sectionHeading, margin: "0 0 12px" }}>Completed Flips Performance</h3>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 9, color: theme.textDim, textTransform: "uppercase", marginBottom: 2 }}>Avg Profit</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: avgSoldProfit >= 0 ? theme.green : theme.red, fontFamily: "'JetBrains Mono', monospace" }}>{fmt(avgSoldProfit)}</div>
            </div>
            <div>
              <div style={{ fontSize: 9, color: theme.textDim, textTransform: "uppercase", marginBottom: 2 }}>Avg ROI</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: avgSoldRoi >= 0.15 ? theme.green : theme.orange, fontFamily: "'JetBrains Mono', monospace" }}>{pct(avgSoldRoi)}</div>
            </div>
            <div>
              <div style={{ fontSize: 9, color: theme.textDim, textTransform: "uppercase", marginBottom: 2 }}>Avg Days to Sell</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: theme.accent, fontFamily: "'JetBrains Mono', monospace" }}>{avgDaysToSell}d</div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {soldPerformance.map((sp) => (
              <div key={sp.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 8px", background: theme.input, borderRadius: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: theme.text }}>{sp.name}</span>
                <div style={{ display: "flex", gap: 12 }}>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 8, color: theme.textDim }}>PROFIT</div>
                    <div style={{ fontSize: 12, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: sp.profit >= 0 ? theme.green : theme.red }}>{fmt(sp.profit)}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 8, color: theme.textDim }}>ROI</div>
                    <div style={{ fontSize: 12, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: sp.roi >= 0.15 ? theme.green : theme.orange }}>{pct(sp.roi)}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 8, color: theme.textDim }}>DAYS</div>
                    <div style={{ fontSize: 12, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: theme.accent }}>{sp.daysToSell}d</div>
                  </div>
                  {sp.aboveAsking !== 0 && (
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 8, color: theme.textDim }}>VS ASKING</div>
                      <div style={{ fontSize: 12, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: sp.aboveAsking >= 0 ? theme.green : theme.red }}>{sp.aboveAsking >= 0 ? "+" : ""}{fmt(sp.aboveAsking)}</div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pipeline by Stage */}
      <div style={styles.card}>
        <h3 style={{ ...styles.sectionHeading, margin: "0 0 12px" }}>Pipeline Value by Stage</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {stageBreakdown.map((stage) => (
            <div key={stage.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 8px", background: theme.input, borderRadius: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: stage.color }} />
                <span style={{ fontSize: 12, color: theme.text, fontWeight: 600 }}>{stage.label}</span>
                <span style={{ fontSize: 10, color: theme.textDim }}>({stage.count})</span>
              </div>
              <div style={{ display: "flex", gap: 16 }}>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 8, color: theme.textDim }}>VALUE</div>
                  <div style={{ fontSize: 12, fontFamily: "'JetBrains Mono', monospace", color: theme.text }}>{fmt(stage.totalValue)}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 8, color: theme.textDim }}>PROFIT</div>
                  <div style={{ fontSize: 12, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: stage.totalProfit >= 0 ? theme.green : theme.red }}>{fmt(stage.totalProfit)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function KPI({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 8, padding: 14 }}>
      <div style={{ fontSize: 9, color: theme.textDim, textTransform: "uppercase", letterSpacing: 0.6, fontWeight: 500, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color, fontFamily: "'JetBrains Mono', monospace", marginBottom: 2 }}>{value}</div>
      <div style={{ fontSize: 10, color: theme.textDim }}>{sub}</div>
    </div>
  );
}
