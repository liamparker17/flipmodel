"use client";
import { useRouter } from "next/navigation";
import { theme, fmt } from "../theme";
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

interface BudgetTabProps {
  dealPnL: DealPnLRow[];
  totalActualExpenses: number;
  isMobile: boolean;
}

export default function BudgetTab({ dealPnL, totalActualExpenses, isMobile }: BudgetTabProps) {
  const router = useRouter();

  return (
    <>
      {/* Budget vs Actuals */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <div style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 8, overflow: "hidden" }}>
          <div style={{ padding: "10px 16px", borderBottom: `1px solid ${theme.cardBorder}` }}>
            <h3 style={{ ...styles.sectionHeading as React.CSSProperties }}>Budget vs Actuals</h3>
          </div>
          <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
            {dealPnL.length === 0 ? (
              <div style={{ fontSize: 12, color: theme.textDim }}>No deals to display.</div>
            ) : (
              dealPnL.map((row) => {
                const budget = row.renoEstimate;
                const spent = row.actualExpenses;
                const pctUsed = budget > 0 ? spent / budget : 0;
                const barPct = Math.min(pctUsed * 100, 100);
                const overflowPct = pctUsed > 1 ? Math.min((pctUsed - 1) * 100, 100) : 0;
                const barColor = pctUsed > 1 ? theme.red : pctUsed >= 0.8 ? theme.orange : theme.green;
                const remaining = budget - spent;
                return (
                  <div key={row.id} onClick={() => router.push(`/pipeline/${row.id}`)} style={{ cursor: "pointer" }}>
                    <div style={{ ...styles.flexBetween as React.CSSProperties, marginBottom: 4 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: theme.text }}>{row.name}</span>
                        <span style={{ fontSize: 8, fontWeight: 600, color: getStageColor(row.stage), background: `${getStageColor(row.stage)}15`, padding: "2px 5px", borderRadius: 3, textTransform: "uppercase" }}>{getStageLabel(row.stage)}</span>
                      </div>
                      <span style={{ fontSize: 10, ...styles.mono as React.CSSProperties, color: barColor, fontWeight: 600 }}>
                        {budget > 0 ? `${Math.round(pctUsed * 100)}%` : "No budget"}
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ flex: 1, height: 10, background: theme.input, borderRadius: 5, overflow: "hidden", position: "relative" }}>
                        <div style={{ height: "100%", width: `${barPct}%`, background: barColor, borderRadius: 5, transition: "width 0.3s ease" }} />
                        {overflowPct > 0 && (
                          <div style={{
                            position: "absolute", top: 0, right: 0, height: "100%",
                            width: `${Math.min(overflowPct, 30)}%`,
                            background: `repeating-linear-gradient(45deg, ${theme.red}, ${theme.red} 2px, ${theme.red}80 2px, ${theme.red}80 4px)`,
                            borderRadius: "0 5px 5px 0",
                          }} />
                        )}
                      </div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
                      <span style={{ fontSize: 10, ...styles.mono as React.CSSProperties, color: theme.textDim }}>
                        {fmt(spent)} spent of {fmt(budget)}
                      </span>
                      <span style={{ fontSize: 10, ...styles.mono as React.CSSProperties, fontWeight: 600, color: remaining >= 0 ? theme.green : theme.red }}>
                        {remaining >= 0 ? `${fmt(remaining)} remaining` : `${fmt(Math.abs(remaining))} over budget`}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Alerts Panel */}
        <div style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 8, overflow: "hidden" }}>
          <div style={{ padding: "10px 16px", borderBottom: `1px solid ${theme.cardBorder}`, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 14 }}>&#9888;</span>
            <h3 style={{ ...styles.sectionHeading as React.CSSProperties }}>Budget Alerts</h3>
          </div>
          <div style={{ padding: 16 }}>
            {(() => {
              const alertDeals = dealPnL.filter((row) => {
                const budget = row.renoEstimate;
                if (budget <= 0) return false;
                return row.actualExpenses / budget >= 0.8;
              }).sort((a, b) => {
                const aPct = a.renoEstimate > 0 ? a.actualExpenses / a.renoEstimate : 0;
                const bPct = b.renoEstimate > 0 ? b.actualExpenses / b.renoEstimate : 0;
                return bPct - aPct;
              });

              if (alertDeals.length === 0) {
                return (
                  <div style={{ padding: 20, textAlign: "center", color: theme.textDim, fontSize: 12 }}>
                    No budget alerts. All deals are under 80% of their renovation budget.
                  </div>
                );
              }

              return (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {alertDeals.map((row) => {
                    const budget = row.renoEstimate;
                    const spent = row.actualExpenses;
                    const pctUsed = budget > 0 ? spent / budget : 0;
                    const isOver = pctUsed > 1;
                    const remaining = budget - spent;
                    return (
                      <div key={row.id} onClick={() => router.push(`/pipeline/${row.id}`)} style={{
                        display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                        background: isOver ? `${theme.red}10` : `${theme.orange}10`,
                        border: `1px solid ${isOver ? theme.red : theme.orange}30`,
                        borderRadius: 6, cursor: "pointer",
                      }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: "50%",
                          background: isOver ? `${theme.red}20` : `${theme.orange}20`,
                          ...styles.flexCenter as React.CSSProperties,
                          fontSize: 12, fontWeight: 700, color: isOver ? theme.red : theme.orange, flexShrink: 0,
                        }}>
                          {isOver ? "!!" : "!"}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: theme.text, marginBottom: 2 }}>{row.name}</div>
                          <div style={{ fontSize: 10, color: theme.textDim }}>
                            {isOver
                              ? `Over budget by ${fmt(Math.abs(remaining))} (${Math.round(pctUsed * 100)}% of budget used)`
                              : `${Math.round(pctUsed * 100)}% of budget used - ${fmt(remaining)} remaining`}
                          </div>
                        </div>
                        <div style={{
                          fontSize: 11, fontWeight: 700, ...styles.mono as React.CSSProperties,
                          color: isOver ? theme.red : theme.orange,
                        }}>
                          {fmt(spent)} / {fmt(budget)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Budget Summary Table */}
      <div style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 8, overflow: "hidden" }}>
        <div style={{ padding: "10px 16px", borderBottom: `1px solid ${theme.cardBorder}` }}>
          <h3 style={{ ...styles.sectionHeading as React.CSSProperties }}>Budget Summary</h3>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${theme.cardBorder}` }}>
                {["Deal", "Stage", "Reno Budget", "Actual Spend", "% Used", "Remaining / Overspent", "Status"].map((h) => (
                  <th key={h} style={{ padding: "7px 10px", textAlign: "left", fontSize: 9, color: theme.textDim, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 500, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dealPnL.map((row) => {
                const budget = row.renoEstimate;
                const spent = row.actualExpenses;
                const pctUsed = budget > 0 ? spent / budget : 0;
                const remaining = budget - spent;
                const statusColor = pctUsed > 1 ? theme.red : pctUsed >= 0.8 ? theme.orange : theme.green;
                const statusLabel = pctUsed > 1 ? "Over Budget" : pctUsed >= 0.8 ? "At Risk" : "On Track";
                const sc = getStageColor(row.stage);
                return (
                  <tr key={row.id} onClick={() => router.push(`/pipeline/${row.id}`)} style={{ borderBottom: `1px solid ${theme.cardBorder}`, cursor: "pointer" }}>
                    <td style={{ padding: "8px 10px", fontSize: 12, fontWeight: 600, color: theme.text }}>{row.name}</td>
                    <td style={{ padding: "8px 10px" }}>
                      <span style={{ fontSize: 8, fontWeight: 600, color: sc, background: `${sc}15`, padding: "2px 6px", borderRadius: 3, textTransform: "uppercase" }}>{getStageLabel(row.stage)}</span>
                    </td>
                    <td style={{ padding: "8px 10px", fontSize: 11, ...styles.mono as React.CSSProperties, color: theme.text }}>{fmt(budget)}</td>
                    <td style={{ padding: "8px 10px", fontSize: 11, ...styles.mono as React.CSSProperties, color: theme.text }}>{fmt(spent)}</td>
                    <td style={{ padding: "8px 10px", fontSize: 11, ...styles.mono as React.CSSProperties, fontWeight: 600, color: statusColor }}>
                      {budget > 0 ? `${Math.round(pctUsed * 100)}%` : "\u2014"}
                    </td>
                    <td style={{ padding: "8px 10px", fontSize: 11, ...styles.mono as React.CSSProperties, fontWeight: 600, color: remaining >= 0 ? theme.green : theme.red }}>
                      {remaining >= 0 ? fmt(remaining) : `(${fmt(Math.abs(remaining))})`}
                    </td>
                    <td style={{ padding: "8px 10px" }}>
                      <span style={{ fontSize: 8, fontWeight: 600, color: statusColor, background: `${statusColor}15`, padding: "2px 6px", borderRadius: 3, textTransform: "uppercase" }}>{statusLabel}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: `2px solid ${theme.cardBorder}` }}>
                <td style={{ padding: "8px 10px", fontSize: 11, fontWeight: 700, color: theme.text }}>Portfolio Total</td>
                <td />
                <td style={{ padding: "8px 10px", fontSize: 11, fontWeight: 700, ...styles.mono as React.CSSProperties, color: theme.text }}>{fmt(dealPnL.reduce((s, d) => s + d.renoEstimate, 0))}</td>
                <td style={{ padding: "8px 10px", fontSize: 11, fontWeight: 700, ...styles.mono as React.CSSProperties, color: theme.text }}>{fmt(totalActualExpenses)}</td>
                <td style={{ padding: "8px 10px", fontSize: 11, fontWeight: 700, ...styles.mono as React.CSSProperties, color: theme.text }}>
                  {dealPnL.reduce((s, d) => s + d.renoEstimate, 0) > 0
                    ? `${Math.round((totalActualExpenses / dealPnL.reduce((s, d) => s + d.renoEstimate, 0)) * 100)}%`
                    : "\u2014"}
                </td>
                <td style={{ padding: "8px 10px", fontSize: 11, fontWeight: 700, ...styles.mono as React.CSSProperties, color: (dealPnL.reduce((s, d) => s + d.renoEstimate, 0) - totalActualExpenses) >= 0 ? theme.green : theme.red }}>
                  {(() => { const r = dealPnL.reduce((s, d) => s + d.renoEstimate, 0) - totalActualExpenses; return r >= 0 ? fmt(r) : `(${fmt(Math.abs(r))})`; })()}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </>
  );
}
