"use client";
import { useState, useEffect } from "react";
import { theme, fmt, pct } from "../../components/theme";
import useDeals from "../../hooks/useDeals";
import { DEAL_STAGES, getStageColor, getStageLabel } from "../../utils/dealHelpers";

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

  let totalPurchase = 0;
  let totalExpectedSale = 0;
  let totalEstProfit = 0;
  const activeCount = deals.filter((d) => d.stage === "purchased" || d.stage === "renovating").length;

  interface DealRow {
    id: string;
    name: string;
    stage: string;
    pp: number;
    sp: number;
    reno: number;
    profit: number;
    months: number;
  }

  const rows: DealRow[] = deals.map((deal) => {
    const pp = deal.purchasePrice || deal.data?.acq?.purchasePrice || 0;
    const sp = deal.expectedSalePrice || deal.data?.resale?.expectedPrice || 0;
    const reno = deal.data?.quickRenoEstimate || 0;
    const profit = sp - pp - reno;
    const months = deal.data?.holding?.renovationMonths || 4;
    totalPurchase += pp;
    totalExpectedSale += sp;
    totalEstProfit += profit;
    return { id: deal.id, name: deal.name, stage: deal.stage, pp, sp, reno, profit, months };
  });

  const avgRoi = totalPurchase > 0 ? totalEstProfit / totalPurchase : 0;

  return (
    <div style={{ padding: isMobile ? 16 : 32, maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ marginBottom: 28, paddingLeft: isMobile ? 48 : 0 }}>
        <h1 style={{ fontSize: isMobile ? 22 : 28, fontWeight: 700, margin: 0 }}>Finance</h1>
        <p style={{ fontSize: 13, color: theme.textDim, margin: "4px 0 0" }}>Aggregated financials across all deals</p>
      </div>

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr 1fr", gap: 16, marginBottom: 32 }}>
        {[
          { label: "Capital Deployed", value: fmt(totalPurchase), color: theme.text, icon: "R" },
          { label: "Expected Portfolio Sale", value: fmt(totalExpectedSale), color: theme.accent, icon: "$" },
          { label: "Expected Portfolio Profit", value: fmt(totalEstProfit), color: totalEstProfit >= 0 ? theme.green : theme.red, icon: "%" },
          { label: "Active Projects", value: String(activeCount), color: theme.orange, icon: "W" },
        ].map((kpi) => (
          <div key={kpi.label} style={{
            background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 12, padding: 20,
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <span style={{ fontSize: 11, color: theme.textDim, textTransform: "uppercase", letterSpacing: 1 }}>{kpi.label}</span>
              <span style={{ width: 32, height: 32, borderRadius: 8, background: `${kpi.color}18`, color: kpi.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700 }}>{kpi.icon}</span>
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, color: kpi.color, fontFamily: "'JetBrains Mono', monospace" }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* Deal Summary Table */}
      <div style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${theme.cardBorder}` }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: theme.accent, textTransform: "uppercase", letterSpacing: 1.5, margin: 0 }}>Deal Summary</h3>
        </div>
        {rows.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: theme.textDim }}>No deals to display.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${theme.cardBorder}` }}>
                  {["Deal", "Stage", "Purchase", "Reno", "Expected Sale", "Est. Profit", "Timeline"].map((h) => (
                    <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 10, color: theme.textDim, textTransform: "uppercase", letterSpacing: 1, fontWeight: 600, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const sc = getStageColor(row.stage as keyof typeof DEAL_STAGES extends never ? string : string);
                  return (
                    <tr key={row.id} style={{ borderBottom: `1px solid ${theme.cardBorder}` }}>
                      <td style={{ padding: "12px 14px", fontSize: 13, fontWeight: 600, color: theme.text }}>{row.name}</td>
                      <td style={{ padding: "12px 14px" }}>
                        <span style={{ fontSize: 10, fontWeight: 600, color: sc, background: `${sc}18`, padding: "3px 8px", borderRadius: 4, textTransform: "uppercase" }}>{getStageLabel(row.stage)}</span>
                      </td>
                      <td style={{ padding: "12px 14px", fontSize: 13, fontFamily: "'JetBrains Mono', monospace", color: theme.text }}>{fmt(row.pp)}</td>
                      <td style={{ padding: "12px 14px", fontSize: 13, fontFamily: "'JetBrains Mono', monospace", color: theme.orange }}>{fmt(row.reno)}</td>
                      <td style={{ padding: "12px 14px", fontSize: 13, fontFamily: "'JetBrains Mono', monospace", color: theme.text }}>{fmt(row.sp)}</td>
                      <td style={{ padding: "12px 14px", fontSize: 13, fontFamily: "'JetBrains Mono', monospace", color: row.profit >= 0 ? theme.green : theme.red }}>{fmt(row.profit)}</td>
                      <td style={{ padding: "12px 14px", fontSize: 13, color: theme.textDim }}>{row.months} mo</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: `2px solid ${theme.accent}40` }}>
                  <td style={{ padding: "12px 14px", fontSize: 13, fontWeight: 700, color: theme.accent }}>Total</td>
                  <td />
                  <td style={{ padding: "12px 14px", fontSize: 13, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: theme.text }}>{fmt(totalPurchase)}</td>
                  <td />
                  <td style={{ padding: "12px 14px", fontSize: 13, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: theme.text }}>{fmt(totalExpectedSale)}</td>
                  <td style={{ padding: "12px 14px", fontSize: 13, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: totalEstProfit >= 0 ? theme.green : theme.red }}>{fmt(totalEstProfit)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
