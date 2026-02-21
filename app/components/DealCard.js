"use client";
import { useRouter } from "next/navigation";
import { theme, fmt, pct } from "./theme";
import { getStageColor, getStageLabel, computeDealMetrics } from "../utils/dealHelpers";

export default function DealCard({ deal, compact = false }) {
  const router = useRouter();
  const metrics = computeDealMetrics(deal.data);
  const stageColor = getStageColor(deal.stage);

  return (
    <div
      onClick={() => router.push(`/pipeline/${deal.id}`)}
      style={{
        background: theme.card, border: `1px solid ${theme.cardBorder}`,
        borderRadius: 10, padding: compact ? 12 : 16, cursor: "pointer",
        transition: "border-color 0.15s",
        borderLeft: `3px solid ${stageColor}`,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = theme.accent; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = theme.cardBorder; e.currentTarget.style.borderLeft = `3px solid ${stageColor}`; }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: compact ? 6 : 10 }}>
        <div style={{ fontSize: compact ? 13 : 14, fontWeight: 600, color: theme.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {deal.name}
        </div>
        <span style={{
          fontSize: 10, fontWeight: 600, color: stageColor,
          background: `${stageColor}18`, padding: "3px 8px", borderRadius: 6,
          textTransform: "uppercase", letterSpacing: 0.5, flexShrink: 0,
        }}>
          {getStageLabel(deal.stage)}
        </span>
      </div>
      {metrics && (
        <div style={{ display: "flex", gap: compact ? 12 : 20, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 10, color: theme.textDim, textTransform: "uppercase" }}>Price</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: theme.text, fontFamily: "'JetBrains Mono', monospace" }}>
              {fmt(metrics.purchasePrice)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: theme.textDim, textTransform: "uppercase" }}>Est. Profit</div>
            <div style={{
              fontSize: 13, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace",
              color: metrics.estimatedProfit >= 0 ? theme.green : theme.red,
            }}>
              {fmt(metrics.estimatedProfit)}
            </div>
          </div>
          {!compact && (
            <div>
              <div style={{ fontSize: 10, color: theme.textDim, textTransform: "uppercase" }}>Timeline</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: theme.textDim }}>
                {metrics.renovationMonths} mo
              </div>
            </div>
          )}
        </div>
      )}
      {!metrics && (
        <div style={{ fontSize: 12, color: theme.textDim, fontStyle: "italic" }}>No analysis data yet</div>
      )}
    </div>
  );
}
