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
    <div style={{ padding: isMobile ? 16 : 28, maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ marginBottom: 24, paddingLeft: isMobile ? 48 : 0 }}>
        <h1 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 600, margin: 0, color: theme.text }}>Reports</h1>
        <p style={{ fontSize: 12, color: theme.textDim, margin: "2px 0 0" }}>Portfolio performance and pipeline analytics</p>
      </div>

      {/* Portfolio Summary */}
      <div style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 8, padding: 16, marginBottom: 16 }}>
        <h3 style={{ fontSize: 11, fontWeight: 600, color: theme.textDim, textTransform: "uppercase", letterSpacing: 0.8, margin: "0 0 12px" }}>Portfolio Summary</h3>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr", gap: 12 }}>
          <div>
            <div style={{ fontSize: 10, color: theme.textDim, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Total Deals</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: theme.accent, fontFamily: "'JetBrains Mono', monospace" }}>{deals.length}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: theme.textDim, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Portfolio ROI</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: overallRoi >= 0.15 ? theme.green : theme.orange, fontFamily: "'JetBrains Mono', monospace" }}>{pct(overallRoi)}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: theme.textDim, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Total Est. Profit</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: overallProfit >= 0 ? theme.green : theme.red, fontFamily: "'JetBrains Mono', monospace" }}>{fmt(overallProfit)}</div>
          </div>
        </div>
      </div>

      {/* Stage Breakdown */}
      <div style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 8, padding: 16, marginBottom: 16 }}>
        <h3 style={{ fontSize: 11, fontWeight: 600, color: theme.textDim, textTransform: "uppercase", letterSpacing: 0.8, margin: "0 0 12px" }}>Pipeline by Stage</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {stageBreakdown.map((stage) => {
            const pctOfTotal = deals.length > 0 ? (stage.count / deals.length) * 100 : 0;
            return (
              <div key={stage.key} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 80, fontSize: 11, color: stage.color, fontWeight: 600 }}>{stage.label}</div>
                <div style={{ flex: 1, height: 20, background: theme.input, borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pctOfTotal}%`, background: stage.color, borderRadius: 3, opacity: 0.7, transition: "width 0.4s", minWidth: stage.count > 0 ? 6 : 0 }} />
                </div>
                <div style={{ width: 24, fontSize: 12, fontWeight: 700, color: stage.color, textAlign: "right", fontFamily: "'JetBrains Mono', monospace" }}>{stage.count}</div>
                <div style={{ width: 100, fontSize: 11, color: theme.textDim, textAlign: "right", fontFamily: "'JetBrains Mono', monospace" }}>{fmt(stage.totalValue)}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Profit Distribution */}
      <div style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 8, padding: 16 }}>
        <h3 style={{ fontSize: 11, fontWeight: 600, color: theme.textDim, textTransform: "uppercase", letterSpacing: 0.8, margin: "0 0 12px" }}>Profit by Stage</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {stageBreakdown.filter((s) => s.count > 0).map((stage) => (
            <div key={stage.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px", background: theme.input, borderRadius: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: stage.color }} />
                <span style={{ fontSize: 12, color: theme.text }}>{stage.label}</span>
                <span style={{ fontSize: 10, color: theme.textDim }}>({stage.count})</span>
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: stage.totalProfit >= 0 ? theme.green : theme.red }}>
                {fmt(stage.totalProfit)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
