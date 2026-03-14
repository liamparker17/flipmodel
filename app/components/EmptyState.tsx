"use client";

import { theme } from "./theme";

interface EmptyStateProps {
  heading: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  /** Optional secondary link */
  secondaryLabel?: string;
  onSecondary?: () => void;
}

export default function EmptyState({ heading, description, actionLabel, onAction, secondaryLabel, onSecondary }: EmptyStateProps) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", padding: "60px 24px", textAlign: "center",
      maxWidth: 420, margin: "0 auto",
    }}>
      {/* Icon placeholder */}
      <div style={{
        width: 56, height: 56, borderRadius: 12,
        background: `${theme.accent}15`, border: `1px solid ${theme.accent}25`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 24, marginBottom: 20, color: theme.accent,
      }}>
        +
      </div>

      <h2 style={{ fontSize: 16, fontWeight: 600, color: theme.text, margin: "0 0 8px" }}>
        {heading}
      </h2>
      <p style={{ fontSize: 13, color: theme.textDim, margin: "0 0 20px", lineHeight: 1.5 }}>
        {description}
      </p>

      {actionLabel && onAction && (
        <button
          onClick={onAction}
          style={{
            background: theme.accent, color: "#fff", border: "none",
            borderRadius: 6, padding: "10px 24px", fontSize: 13,
            fontWeight: 600, cursor: "pointer", marginBottom: 8,
          }}
        >
          {actionLabel}
        </button>
      )}

      {secondaryLabel && onSecondary && (
        <button
          onClick={onSecondary}
          style={{
            background: "none", border: "none", color: theme.textDim,
            fontSize: 11, cursor: "pointer", textDecoration: "underline",
          }}
        >
          {secondaryLabel}
        </button>
      )}
    </div>
  );
}
