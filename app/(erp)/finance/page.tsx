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

  return (
    <div style={{ padding: isMobile ? 16 : 28, maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ marginBottom: 24, paddingLeft: isMobile ? 48 : 0 }}>
        <h1 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 600, margin: 0, color: theme.text }}>Finance</h1>
        <p style={{ fontSize: 12, color: theme.textDim, margin: "2px 0 0" }}>Aggregated financials across all deals</p>
      </div>

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr 1fr", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Capital Deployed", value: fmt(totalPurchase), color: theme.text },
          { label: "Expected Sale Total", value: fmt(totalExpectedSale), color: theme.accent },
          { label: "Expected Profit", value: fmt(totalEstProfit), color: totalEstProfit >= 0 ? theme.green : theme.red },
          { label: "Active Projects", value: String(activeCount), color: theme.orange },
        ].map((kpi) => (
          <div key={kpi.label} style={{
            background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 8, padding: 16,
          }}>
            <div style={{ fontSize: 10, color: theme.textDim, textTransform: "uppercase", letterSpacing: 0.6, fontWeight: 500, marginBottom: 8 }}>{kpi.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: kpi.color, fontFamily: "'JetBrains Mono', monospace" }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* Deal Summary Table */}
      <div style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 8, overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", borderBottom: `1px solid ${theme.cardBorder}` }}>
          <h3 style={{ fontSize: 11, fontWeight: 600, color: theme.textDim, textTransform: "uppercase", letterSpacing: 0.8, margin: 0 }}>Deal Summary</h3>
        </div>
        {rows.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: theme.textDim, fontSize: 13 }}>No deals to display.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${theme.cardBorder}` }}>
                  {["Deal", "Stage", "Purchase", "Reno", "Expected Sale", "Est. Profit", "Timeline"].map((h) => (
                    <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: 10, color: theme.textDim, textTransform: "uppercase", letterSpacing: 0.6, fontWeight: 500, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const sc = getStageColor(row.stage);
                  return (
                    <tr key={row.id} style={{ borderBottom: `1px solid ${theme.cardBorder}` }}>
                      <td style={{ padding: "10px 12px", fontSize: 12, fontWeight: 600, color: theme.text }}>{row.name}</td>
                      <td style={{ padding: "10px 12px" }}>
                        <span style={{ fontSize: 9, fontWeight: 600, color: sc, background: `${sc}15`, padding: "2px 6px", borderRadius: 3, textTransform: "uppercase" }}>{getStageLabel(row.stage)}</span>
                      </td>
                      <td style={{ padding: "10px 12px", fontSize: 12, fontFamily: "'JetBrains Mono', monospace", color: theme.text }}>{fmt(row.pp)}</td>
                      <td style={{ padding: "10px 12px", fontSize: 12, fontFamily: "'JetBrains Mono', monospace", color: theme.orange }}>{fmt(row.reno)}</td>
                      <td style={{ padding: "10px 12px", fontSize: 12, fontFamily: "'JetBrains Mono', monospace", color: theme.text }}>{fmt(row.sp)}</td>
                      <td style={{ padding: "10px 12px", fontSize: 12, fontFamily: "'JetBrains Mono', monospace", color: row.profit >= 0 ? theme.green : theme.red }}>{fmt(row.profit)}</td>
                      <td style={{ padding: "10px 12px", fontSize: 12, color: theme.textDim }}>{row.months} mo</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: `2px solid ${theme.cardBorder}` }}>
                  <td style={{ padding: "10px 12px", fontSize: 12, fontWeight: 700, color: theme.text }}>Total</td>
                  <td />
                  <td style={{ padding: "10px 12px", fontSize: 12, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: theme.text }}>{fmt(totalPurchase)}</td>
                  <td />
                  <td style={{ padding: "10px 12px", fontSize: 12, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: theme.text }}>{fmt(totalExpectedSale)}</td>
                  <td style={{ padding: "10px 12px", fontSize: 12, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: totalEstProfit >= 0 ? theme.green : theme.red }}>{fmt(totalEstProfit)}</td>
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
