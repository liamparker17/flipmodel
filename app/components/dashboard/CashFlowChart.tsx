"use client";
import { theme, fmt, styles } from "../theme";

interface CashFlowMonth {
  month: string;
  inflow: number;
  outflow: number;
  net: number;
}

interface CashFlowChartProps {
  cashFlow: CashFlowMonth[];
  cfMax: number;
  now: Date;
}

export default function CashFlowChart({ cashFlow, cfMax, now }: CashFlowChartProps) {
  return (
    <div style={styles.card}>
      <div style={{ ...styles.flexBetween, marginBottom: 12 }}>
        <h3 style={styles.sectionHeading as React.CSSProperties}>Cash Flow</h3>
        <div style={{ display: "flex", gap: 12 }}>
          <span style={{ fontSize: 9, display: "flex", alignItems: "center", gap: 3 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: theme.green, display: "inline-block" }} /> <span style={{ color: theme.textDim }}>Inflow</span></span>
          <span style={{ fontSize: 9, display: "flex", alignItems: "center", gap: 3 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: theme.red, display: "inline-block" }} /> <span style={{ color: theme.textDim }}>Outflow</span></span>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {cashFlow.map((m) => {
          const monthLabel = new Date(m.month + "-01").toLocaleDateString("en-ZA", { month: "short", year: "2-digit" });
          const isCurrentMonth = m.month === `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
          return (
            <div key={m.month} style={{ display: "flex", alignItems: "center", gap: 6, opacity: isCurrentMonth ? 1 : 0.7 }}>
              <div style={{ width: 46, fontSize: 10, color: isCurrentMonth ? theme.accent : theme.textDim, fontWeight: isCurrentMonth ? 700 : 400, ...styles.mono }}>{monthLabel}</div>
              <div style={{ flex: 1, display: "flex", gap: 2 }}>
                {m.inflow > 0 && <div style={{ height: 12, width: `${(m.inflow / cfMax) * 100}%`, background: theme.green, borderRadius: 2, opacity: 0.6, minWidth: 3 }} />}
                {m.outflow > 0 && <div style={{ height: 12, width: `${(m.outflow / cfMax) * 100}%`, background: theme.red, borderRadius: 2, opacity: 0.6, minWidth: 3 }} />}
              </div>
              <div style={{ width: 80, fontSize: 10, textAlign: "right", ...styles.mono, color: m.net >= 0 ? theme.green : theme.red }}>{fmt(m.net)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
