"use client";
import { useState, useEffect } from "react";
import { theme, fmt, pct } from "../../components/theme";
import useDeals from "../../hooks/useDeals";
import { DEAL_STAGES } from "../../utils/dealHelpers";

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

  // Aggregate data for reports
  const stageBreakdown = DEAL_STAGES.map((stage) => {
    const stageDeals = deals.filter((d) => d.stage === stage.key);
    let totalValue = 0;
    let totalProfit = 0;
    for (const d of stageDeals) {
      const pp = d.purchasePrice || d.data?.acq?.purchasePrice || 0;
      const sp = d.expectedSalePrice || d.data?.resale?.expectedPrice || 0;
      const reno = d.data?.quickRenoEstimate || 0;
      totalValue += pp;
      totalProfit += sp - pp - reno;
    }
    return { ...stage, count: stageDeals.length, totalValue, totalProfit };
  });

  let overallPurchase = 0;
  let overallProfit = 0;
  for (const d of deals) {
    const pp = d.purchasePrice || d.data?.acq?.purchasePrice || 0;
    const sp = d.expectedSalePrice || d.data?.resale?.expectedPrice || 0;
    const reno = d.data?.quickRenoEstimate || 0;
    overallPurchase += pp;
    overallProfit += sp - pp - reno;
  }
  const overallRoi = overallPurchase > 0 ? overallProfit / overallPurchase : 0;

  return (
    <div style={{ padding: isMobile ? 16 : 32, maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ marginBottom: 28, paddingLeft: isMobile ? 48 : 0 }}>
        <h1 style={{ fontSize: isMobile ? 22 : 28, fontWeight: 700, margin: 0 }}>Reports</h1>
        <p style={{ fontSize: 13, color: theme.textDim, margin: "4px 0 0" }}>Portfolio performance and pipeline analytics</p>
      </div>

      {/* Portfolio Summary */}
      <div style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 12, padding: 20, marginBottom: 24 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: theme.accent, textTransform: "uppercase", letterSpacing: 1.5, margin: "0 0 16px" }}>Portfolio Summary</h3>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr", gap: 16 }}>
          <div>
            <div style={{ fontSize: 11, color: theme.textDim, textTransform: "uppercase", marginBottom: 4 }}>Total Deals</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: theme.accent, fontFamily: "'JetBrains Mono', monospace" }}>{deals.length}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: theme.textDim, textTransform: "uppercase", marginBottom: 4 }}>Portfolio ROI</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: overallRoi >= 0.15 ? theme.green : theme.orange, fontFamily: "'JetBrains Mono', monospace" }}>{pct(overallRoi)}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: theme.textDim, textTransform: "uppercase", marginBottom: 4 }}>Total Est. Profit</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: overallProfit >= 0 ? theme.green : theme.red, fontFamily: "'JetBrains Mono', monospace" }}>{fmt(overallProfit)}</div>
          </div>
        </div>
      </div>

      {/* Stage Breakdown */}
      <div style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 12, padding: 20, marginBottom: 24 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: theme.accent, textTransform: "uppercase", letterSpacing: 1.5, margin: "0 0 16px" }}>Pipeline by Stage</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {stageBreakdown.map((stage) => {
            const pctOfTotal = deals.length > 0 ? (stage.count / deals.length) * 100 : 0;
            return (
              <div key={stage.key} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 100, fontSize: 12, color: stage.color, fontWeight: 600 }}>{stage.label}</div>
                <div style={{ flex: 1, height: 24, background: theme.input, borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pctOfTotal}%`, background: stage.color, borderRadius: 4, opacity: 0.7, transition: "width 0.4s", minWidth: stage.count > 0 ? 8 : 0 }} />
                </div>
                <div style={{ width: 30, fontSize: 13, fontWeight: 700, color: stage.color, textAlign: "right", fontFamily: "'JetBrains Mono', monospace" }}>{stage.count}</div>
                <div style={{ width: 120, fontSize: 12, color: theme.textDim, textAlign: "right", fontFamily: "'JetBrains Mono', monospace" }}>{fmt(stage.totalValue)}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Profit Distribution */}
      <div style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 12, padding: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: theme.accent, textTransform: "uppercase", letterSpacing: 1.5, margin: "0 0 16px" }}>Profit by Stage</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {stageBreakdown.filter((s) => s.count > 0).map((stage) => (
            <div key={stage.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: theme.input, borderRadius: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: stage.color }} />
                <span style={{ fontSize: 13, color: theme.text }}>{stage.label}</span>
                <span style={{ fontSize: 11, color: theme.textDim }}>({stage.count} deals)</span>
              </div>
              <span style={{ fontSize: 14, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: stage.totalProfit >= 0 ? theme.green : theme.red }}>
                {fmt(stage.totalProfit)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
