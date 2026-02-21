"use client";
import { useState, useEffect } from "react";
import { theme, fmt, pct } from "../../components/theme";
import KPICard from "../../components/KPICard";
import useDeals from "../../hooks/useDeals";
import { getStageLabel, getStageColor, computeDealMetrics } from "../../utils/dealHelpers";

export default function FinancePage() {
  const { deals, loaded } = useDeals();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  if (!loaded) return <div style={{ padding: 40, color: theme.textDim }}>Loading...</div>;

  // Aggregate financials
  let totalPurchase = 0;
  let totalExpectedSale = 0;
  let totalEstProfit = 0;
  const dealRows = [];

  for (const deal of deals) {
    const m = computeDealMetrics(deal.data);
    if (m) {
      totalPurchase += m.purchasePrice;
      totalExpectedSale += m.expectedPrice;
      totalEstProfit += m.estimatedProfit;
      dealRows.push({ deal, metrics: m });
    } else {
      dealRows.push({ deal, metrics: null });
    }
  }

  const avgRoi = totalPurchase > 0 ? totalEstProfit / totalPurchase : 0;

  return (
    <div style={{ padding: isMobile ? 16 : 32, maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ marginBottom: 24, paddingLeft: isMobile ? 48 : 0 }}>
        <h1 style={{ fontSize: isMobile ? 22 : 28, fontWeight: 700, margin: 0 }}>Finance</h1>
        <p style={{ fontSize: 13, color: theme.textDim, margin: "4px 0 0" }}>Aggregated financials across all deals</p>
      </div>

      {/* KPI Cards */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 32 }}>
        <KPICard label="Total Purchase Value" value={fmt(totalPurchase)} icon="R" color={theme.text} />
        <KPICard label="Total Expected Sale" value={fmt(totalExpectedSale)} icon="$" color={theme.accent} />
        <KPICard label="Total Est. Profit" value={fmt(totalEstProfit)} icon="%" color={totalEstProfit >= 0 ? theme.green : theme.red} />
        <KPICard label="Avg ROI" value={pct(avgRoi)} icon="A" color={avgRoi >= 0.15 ? theme.green : avgRoi >= 0 ? theme.orange : theme.red} />
      </div>

      {/* Per-deal summary table */}
      <div style={{
        background: theme.card, border: `1px solid ${theme.cardBorder}`,
        borderRadius: 12, overflow: "hidden",
      }}>
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${theme.cardBorder}` }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: theme.accent, textTransform: "uppercase", letterSpacing: 1.5, margin: 0 }}>
            Deal Summary
          </h3>
        </div>

        {dealRows.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: theme.textDim }}>
            No deals to display.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${theme.cardBorder}` }}>
                  {["Deal", "Stage", "Purchase", "Expected Sale", "Est. Profit", "Timeline"].map((h) => (
                    <th key={h} style={{
                      padding: "10px 14px", textAlign: "left", fontSize: 10,
                      color: theme.textDim, textTransform: "uppercase", letterSpacing: 1,
                      fontWeight: 600, whiteSpace: "nowrap",
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dealRows.map(({ deal, metrics }) => {
                  const stageColor = getStageColor(deal.stage);
                  return (
                    <tr key={deal.id} style={{ borderBottom: `1px solid ${theme.cardBorder}` }}>
                      <td style={{ padding: "12px 14px", fontSize: 13, fontWeight: 600, color: theme.text }}>{deal.name}</td>
                      <td style={{ padding: "12px 14px" }}>
                        <span style={{
                          fontSize: 10, fontWeight: 600, color: stageColor,
                          background: `${stageColor}18`, padding: "3px 8px", borderRadius: 4,
                          textTransform: "uppercase",
                        }}>{getStageLabel(deal.stage)}</span>
                      </td>
                      <td style={{ padding: "12px 14px", fontSize: 13, fontFamily: "'JetBrains Mono', monospace", color: theme.text }}>
                        {metrics ? fmt(metrics.purchasePrice) : "—"}
                      </td>
                      <td style={{ padding: "12px 14px", fontSize: 13, fontFamily: "'JetBrains Mono', monospace", color: theme.text }}>
                        {metrics ? fmt(metrics.expectedPrice) : "—"}
                      </td>
                      <td style={{
                        padding: "12px 14px", fontSize: 13, fontFamily: "'JetBrains Mono', monospace",
                        color: metrics ? (metrics.estimatedProfit >= 0 ? theme.green : theme.red) : theme.textDim,
                      }}>
                        {metrics ? fmt(metrics.estimatedProfit) : "—"}
                      </td>
                      <td style={{ padding: "12px 14px", fontSize: 13, color: theme.textDim }}>
                        {metrics ? `${metrics.renovationMonths} mo` : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: `2px solid ${theme.accent}40` }}>
                  <td style={{ padding: "12px 14px", fontSize: 13, fontWeight: 700, color: theme.accent }}>Total</td>
                  <td style={{ padding: "12px 14px" }}></td>
                  <td style={{ padding: "12px 14px", fontSize: 13, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: theme.text }}>{fmt(totalPurchase)}</td>
                  <td style={{ padding: "12px 14px", fontSize: 13, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: theme.text }}>{fmt(totalExpectedSale)}</td>
                  <td style={{
                    padding: "12px 14px", fontSize: 13, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace",
                    color: totalEstProfit >= 0 ? theme.green : theme.red,
                  }}>{fmt(totalEstProfit)}</td>
                  <td style={{ padding: "12px 14px" }}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
