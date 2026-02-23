"use client";
import { theme, styles } from "../theme";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

interface ActionItem {
  icon: string;
  description: string;
  link: string;
  color: string;
}

interface ActionItemsProps {
  actionItems: ActionItem[];
  router: AppRouterInstance;
}

export default function ActionItems({ actionItems, router }: ActionItemsProps) {
  return (
    <div style={{ ...styles.card, marginTop: 16 }}>
      <h3 style={{ ...styles.sectionHeading as React.CSSProperties, margin: "0 0 12px" }}>Action Items</h3>
      {actionItems.length === 0 ? (
        <p style={{ fontSize: 12, color: theme.textDim, margin: 0 }}>No action items right now. Everything looks good.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 280, overflowY: "auto" }}>
          {actionItems.map((item, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "8px 10px",
              background: theme.input, borderRadius: 6,
              borderLeft: `3px solid ${item.color}`,
            }}>
              <span style={{ fontSize: 14, flexShrink: 0 }}>{item.icon}</span>
              <span style={{ flex: 1, fontSize: 11, color: theme.text, lineHeight: 1.4 }}>{item.description}</span>
              <button
                onClick={() => router.push(item.link)}
                style={{
                  background: "transparent", border: `1px solid ${theme.accent}`, borderRadius: 4,
                  padding: "3px 10px", fontSize: 10, fontWeight: 600, color: theme.accent,
                  cursor: "pointer", flexShrink: 0, whiteSpace: "nowrap",
                }}
              >
                View →
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
