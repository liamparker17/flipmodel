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

interface PnLTabProps {
  dealPnL: DealPnLRow[];
}

export default function PnLTab({ dealPnL }: PnLTabProps) {
  const router = useRouter();

  return (
    <div style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 8, overflow: "hidden" }}>
      <div style={{ padding: "10px 16px", borderBottom: `1px solid ${theme.cardBorder}` }}>
        <h3 style={{ ...styles.sectionHeading as React.CSSProperties }}>Profit & Loss by Deal</h3>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${theme.cardBorder}` }}>
              {["Deal", "Stage", "Revenue", "Purchase", "Reno Est.", "Actual Costs", "Commission", "Net Profit", "ROI", "Status"].map((h) => (
                <th key={h} style={{ padding: "7px 10px", textAlign: "left", fontSize: 8, color: theme.textDim, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 500, whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dealPnL.map((row) => {
              const sc = getStageColor(row.stage);
              const isSold = row.stage === "sold";
              const revenue = isSold ? row.actualSale : row.expectedSale;
              return (
                <tr key={row.id} onClick={() => router.push(`/pipeline/${row.id}`)} style={{ borderBottom: `1px solid ${theme.cardBorder}`, cursor: "pointer" }}>
                  <td style={{ padding: "7px 10px", fontSize: 11, fontWeight: 600, color: theme.text }}>{row.name}</td>
                  <td style={{ padding: "7px 10px" }}>
                    <span style={{ fontSize: 8, fontWeight: 600, color: sc, background: `${sc}15`, padding: "2px 5px", borderRadius: 3, textTransform: "uppercase" }}>{getStageLabel(row.stage)}</span>
                  </td>
                  <td style={{ padding: "7px 10px", fontSize: 11, ...styles.mono as React.CSSProperties, color: theme.green }}>{fmt(revenue)}</td>
                  <td style={{ padding: "7px 10px", fontSize: 11, ...styles.mono as React.CSSProperties, color: theme.red }}>({fmt(row.purchasePrice)})</td>
                  <td style={{ padding: "7px 10px", fontSize: 11, ...styles.mono as React.CSSProperties, color: theme.orange }}>({fmt(row.renoEstimate)})</td>
                  <td style={{ padding: "7px 10px", fontSize: 11, ...styles.mono as React.CSSProperties, color: theme.orange }}>({fmt(row.actualExpenses)})</td>
                  <td style={{ padding: "7px 10px", fontSize: 11, ...styles.mono as React.CSSProperties, color: theme.red }}>({fmt(row.commission)})</td>
                  <td style={{ padding: "7px 10px", fontSize: 11, fontWeight: 700, ...styles.mono as React.CSSProperties, color: (isSold ? row.actualProfit : row.estimatedProfit) >= 0 ? theme.green : theme.red }}>
                    {fmt(isSold ? row.actualProfit : row.estimatedProfit)}
                  </td>
                  <td style={{ padding: "7px 10px", fontSize: 11, ...styles.mono as React.CSSProperties, color: row.roi >= 0.15 ? theme.green : row.roi >= 0 ? theme.orange : theme.red }}>{pct(row.roi)}</td>
                  <td style={{ padding: "7px 10px", fontSize: 9, color: isSold ? theme.green : theme.textDim }}>{isSold ? "Realized" : "Projected"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
