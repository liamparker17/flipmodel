"use client";
import { theme } from "../../../components/theme";

export function SectionHeader({ label, count, color = theme.textDim }: { label: string; count: number; color?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "8px 0 12px" }}>
      <div style={{ height: 1, flex: 1, background: theme.cardBorder }} />
      <span style={{ fontSize: 11, color, textTransform: "uppercase", letterSpacing: 1, fontWeight: 600 }}>{label} ({count})</span>
      <div style={{ height: 1, flex: 1, background: theme.cardBorder }} />
    </div>
  );
}
