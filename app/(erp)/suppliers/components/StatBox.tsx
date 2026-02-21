"use client";
import { theme, fmt } from "../../../components/theme";

export function StatBox({ label, value, sub, color = theme.text }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div style={{ background: theme.input, borderRadius: 6, padding: "10px 14px", flex: 1, minWidth: 130, border: `1px solid ${theme.inputBorder}` }}>
      <div style={{ fontSize: 10, color: theme.textDim, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 4, fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color, fontFamily: "'JetBrains Mono', monospace" }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}
