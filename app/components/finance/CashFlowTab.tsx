"use client";
import { theme, fmt } from "../theme";
import { styles } from "../theme";

interface CashFlowMonth {
  month: string;
  inflow: number;
  outflow: number;
  net: number;
}

interface CashFlowTabProps {
  cashFlow: CashFlowMonth[];
  cfMax: number;
}

export default function CashFlowTab({ cashFlow, cfMax }: CashFlowTabProps) {
  const now = new Date();

  return (
    <div style={{ ...styles.card as React.CSSProperties }}>
      <div style={{ ...styles.flexBetween as React.CSSProperties, marginBottom: 16 }}>
        <h3 style={{ ...styles.sectionHeading as React.CSSProperties }}>Cash Flow Projection</h3>
        <div style={{ display: "flex", gap: 12 }}>
          <span style={{ fontSize: 9, display: "flex", alignItems: "center", gap: 3 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: theme.green, display: "inline-block" }} /> <span style={{ color: theme.textDim }}>Inflow (Sales)</span></span>
          <span style={{ fontSize: 9, display: "flex", alignItems: "center", gap: 3 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: theme.red, display: "inline-block" }} /> <span style={{ color: theme.textDim }}>Outflow (Expenses)</span></span>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {cashFlow.map((m) => {
          const monthLabel = new Date(m.month + "-01").toLocaleDateString("en-ZA", { month: "long", year: "numeric" });
          const isCurrent = m.month === `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
          return (
            <div key={m.month} style={{
              display: "grid", gridTemplateColumns: "120px 1fr 100px 100px 100px", alignItems: "center", gap: 8,
              padding: "8px 10px", background: isCurrent ? `${theme.accent}08` : "transparent", borderRadius: 6,
              borderLeft: isCurrent ? `3px solid ${theme.accent}` : "3px solid transparent",
            }}>
              <div style={{ fontSize: 11, color: isCurrent ? theme.accent : theme.text, fontWeight: isCurrent ? 700 : 400 }}>{monthLabel}</div>
              <div style={{ display: "flex", gap: 2, alignItems: "center" }}>
                {m.inflow > 0 && <div style={{ height: 14, width: `${(m.inflow / cfMax) * 100}%`, background: theme.green, borderRadius: 3, opacity: 0.6, minWidth: 4 }} />}
                {m.outflow > 0 && <div style={{ height: 14, width: `${(m.outflow / cfMax) * 100}%`, background: theme.red, borderRadius: 3, opacity: 0.6, minWidth: 4 }} />}
              </div>
              <div style={{ fontSize: 11, ...styles.mono as React.CSSProperties, color: theme.green, textAlign: "right" }}>{m.inflow > 0 ? fmt(m.inflow) : "\u2014"}</div>
              <div style={{ fontSize: 11, ...styles.mono as React.CSSProperties, color: theme.red, textAlign: "right" }}>{m.outflow > 0 ? fmt(m.outflow) : "\u2014"}</div>
              <div style={{ fontSize: 11, ...styles.mono as React.CSSProperties, color: m.net >= 0 ? theme.green : theme.red, textAlign: "right", fontWeight: 700 }}>{fmt(m.net)}</div>
            </div>
          );
        })}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "120px 1fr 100px 100px 100px", gap: 8, padding: "4px 10px", marginTop: 4, fontSize: 9, color: theme.textDim }}>
        <div />
        <div />
        <div style={{ textAlign: "right" }}>INFLOW</div>
        <div style={{ textAlign: "right" }}>OUTFLOW</div>
        <div style={{ textAlign: "right" }}>NET</div>
      </div>
    </div>
  );
}
