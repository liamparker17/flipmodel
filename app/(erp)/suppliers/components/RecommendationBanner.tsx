"use client";
import { useState } from "react";
import { theme } from "../../../components/theme";
import type { Recommendation } from "../lib/recommendations";

const TYPE_STYLES: Record<string, { bg: string; color: string; icon: string }> = {
  savings: { bg: `#22c55e10`, color: "#22c55e", icon: "💰" },
  tip: { bg: `#3b82f610`, color: "#3b82f6", icon: "💡" },
  insight: { bg: `#8b5cf610`, color: "#8b5cf6", icon: "📊" },
};

export function RecommendationBanner({ recommendations }: { recommendations: Recommendation[] }) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const visible = recommendations.filter((r) => !dismissed.has(r.id));
  if (visible.length === 0) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
      {visible.map((rec) => {
        const style = TYPE_STYLES[rec.type] || TYPE_STYLES.tip;
        return (
          <div key={rec.id} style={{
            background: style.bg, border: `1px solid ${style.color}25`,
            borderRadius: 8, padding: "8px 14px",
            display: "flex", alignItems: "center", gap: 10,
          }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>{style.icon}</span>
            <span style={{ flex: 1, fontSize: 12, color: style.color, fontWeight: 500 }}>{rec.text}</span>
            <button
              onClick={() => setDismissed((prev) => new Set(prev).add(rec.id))}
              style={{
                background: "transparent", border: "none", color: style.color,
                cursor: "pointer", fontSize: 14, padding: "2px 6px", opacity: 0.6,
                lineHeight: 1,
              }}
              title="Dismiss"
            >
              ✕
            </button>
          </div>
        );
      })}
    </div>
  );
}
