"use client";
import { theme } from "./theme";

export default function KPICard({ label, value, sub, color = theme.accent, icon }) {
  return (
    <div style={{
      background: theme.card, border: `1px solid ${theme.cardBorder}`,
      borderRadius: 12, padding: 20, flex: 1, minWidth: 180,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <span style={{ fontSize: 11, color: theme.textDim, textTransform: "uppercase", letterSpacing: 1 }}>{label}</span>
        {icon && (
          <span style={{
            width: 32, height: 32, borderRadius: 8,
            background: `${color}18`, color,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, fontWeight: 700,
          }}>{icon}</span>
        )}
      </div>
      <div style={{ fontSize: 24, fontWeight: 700, color, fontFamily: "'JetBrains Mono', monospace", marginBottom: 4 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 12, color: theme.textDim }}>{sub}</div>}
    </div>
  );
}
