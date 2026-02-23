"use client";
import { useRouter } from "next/navigation";
import { theme, fmt, pct } from "../theme";
import { styles } from "../theme";
import { getStageColor, getStageLabel } from "../../utils/dealHelpers";

interface DealPnLRow {
  id: string;
  name: string;
  stage: string;
  purchasePrice: number;
  expectedSale: number;
  actualSale: number;
  renoEstimate: number;
  actualExpenses: number;
  projectedExpenses: number;
  commission: number;
  estimatedProfit: number;
  actualProfit: number;
  roi: number;
}

interface FinanceOverviewProps {
  dealPnL: DealPnLRow[];
  totalPurchase: number;
  totalActualExpenses: number;
  totalExpectedSale: number;
  totalEstProfit: number;
  avgRoi: number;
}

export default function FinanceOverview({ dealPnL, totalPurchase, totalActualExpenses, totalExpectedSale, totalEstProfit, avgRoi }: FinanceOverviewProps) {
  const router = useRouter();

  return (
    <div style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 8, overflow: "hidden", marginBottom: 16 }}>
      <div style={{ padding: "10px 16px", borderBottom: `1px solid ${theme.cardBorder}` }}>
        <h3 style={{ ...styles.sectionHeading as React.CSSProperties }}>Deal P&L Summary</h3>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${theme.cardBorder}` }}>
              {["Deal", "Stage", "Purchase", "Reno Est.", "Actual Spend", "Expected Sale", "Est. Profit", "ROI"].map((h) => (
                <th key={h} style={{ padding: "7px 10px", textAlign: "left", fontSize: 9, color: theme.textDim, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 500, whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dealPnL.map((row) => {
              const sc = getStageColor(row.stage);
              return (
                <tr key={row.id} onClick={() => router.push(`/pipeline/${row.id}`)} style={{ borderBottom: `1px solid ${theme.cardBorder}`, cursor: "pointer" }}>
                  <td style={{ padding: "8px 10px", fontSize: 12, fontWeight: 600, color: theme.text }}>{row.name}</td>
                  <td style={{ padding: "8px 10px" }}>
                    <span style={{ fontSize: 8, fontWeight: 600, color: sc, background: `${sc}15`, padding: "2px 6px", borderRadius: 3, textTransform: "uppercase" }}>{getStageLabel(row.stage)}</span>
                  </td>
                  <td style={{ padding: "8px 10px", fontSize: 11, ...styles.mono as React.CSSProperties, color: theme.text }}>{fmt(row.purchasePrice)}</td>
                  <td style={{ padding: "8px 10px", fontSize: 11, ...styles.mono as React.CSSProperties, color: theme.orange }}>{fmt(row.renoEstimate)}</td>
                  <td style={{ padding: "8px 10px", fontSize: 11, ...styles.mono as React.CSSProperties, color: theme.text }}>{fmt(row.actualExpenses)}</td>
                  <td style={{ padding: "8px 10px", fontSize: 11, ...styles.mono as React.CSSProperties, color: theme.text }}>{row.actualSale ? fmt(row.actualSale) : fmt(row.expectedSale)}</td>
                  <td style={{ padding: "8px 10px", fontSize: 11, ...styles.mono as React.CSSProperties, color: row.estimatedProfit >= 0 ? theme.green : theme.red }}>{fmt(row.estimatedProfit)}</td>
                  <td style={{ padding: "8px 10px", fontSize: 11, ...styles.mono as React.CSSProperties, color: row.roi >= 0.15 ? theme.green : row.roi >= 0 ? theme.orange : theme.red }}>{pct(row.roi)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{ borderTop: `2px solid ${theme.cardBorder}` }}>
              <td style={{ padding: "8px 10px", fontSize: 11, fontWeight: 700, color: theme.text }}>Portfolio Total</td>
              <td />
              <td style={{ padding: "8px 10px", fontSize: 11, fontWeight: 700, ...styles.mono as React.CSSProperties, color: theme.text }}>{fmt(totalPurchase)}</td>
              <td style={{ padding: "8px 10px", fontSize: 11, fontWeight: 700, ...styles.mono as React.CSSProperties, color: theme.orange }}>{fmt(dealPnL.reduce((s, d) => s + d.renoEstimate, 0))}</td>
              <td style={{ padding: "8px 10px", fontSize: 11, fontWeight: 700, ...styles.mono as React.CSSProperties, color: theme.text }}>{fmt(totalActualExpenses)}</td>
              <td style={{ padding: "8px 10px", fontSize: 11, fontWeight: 700, ...styles.mono as React.CSSProperties, color: theme.text }}>{fmt(totalExpectedSale)}</td>
              <td style={{ padding: "8px 10px", fontSize: 11, fontWeight: 700, ...styles.mono as React.CSSProperties, color: totalEstProfit >= 0 ? theme.green : theme.red }}>{fmt(totalEstProfit)}</td>
              <td style={{ padding: "8px 10px", fontSize: 11, fontWeight: 700, ...styles.mono as React.CSSProperties, color: avgRoi >= 0.15 ? theme.green : theme.orange }}>{pct(avgRoi)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
