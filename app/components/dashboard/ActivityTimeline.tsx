"use client";
import { theme, styles } from "../theme";
import { DEAL_STAGES } from "../../utils/dealHelpers";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import type { Deal } from "../../types/deal";

interface ActivityTimelineProps {
  timelineDeals: Deal[];
  timeAgo: (dateStr: string) => string;
  router: AppRouterInstance;
}

export default function ActivityTimeline({ timelineDeals, timeAgo, router }: ActivityTimelineProps) {
  return (
    <div style={{ ...styles.card, marginTop: 16 }} role="region" aria-label="Activity timeline">
      <h3 style={{ ...styles.sectionHeading as React.CSSProperties, margin: "0 0 12px" }}>Activity Timeline</h3>
      {timelineDeals.length === 0 ? (
        <p style={{ fontSize: 12, color: theme.textDim, margin: 0 }}>No recent activity.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {timelineDeals.map((deal, i) => {
            const stageInfo = DEAL_STAGES.find((s) => s.key === deal.stage);
            return (
              <div key={deal.id} style={{ display: "flex", gap: 12, position: "relative" }}>
                {/* Timeline line */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 16, flexShrink: 0 }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: "50%", background: stageInfo?.color || theme.accent,
                    border: `2px solid ${theme.card}`, flexShrink: 0, zIndex: 1, marginTop: 4,
                  }} />
                  {i < timelineDeals.length - 1 && (
                    <div style={{ width: 1, flex: 1, background: theme.cardBorder, minHeight: 20 }} />
                  )}
                </div>
                {/* Content */}
                <div
                  onClick={() => router.push(`/pipeline/${deal.id}`)}
                  role="button"
                  tabIndex={0}
                  aria-label={`${deal.name} - ${stageInfo?.label || deal.stage}`}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") router.push(`/pipeline/${deal.id}`); }}
                  style={{ flex: 1, paddingBottom: i < timelineDeals.length - 1 ? 12 : 0, cursor: "pointer" }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: theme.text }}>{deal.name}</span>
                    <span style={{
                      fontSize: 8, fontWeight: 600, color: stageInfo?.color,
                      background: `${stageInfo?.color}15`, padding: "1px 6px", borderRadius: 3,
                      textTransform: "uppercase",
                    }}>{stageInfo?.label}</span>
                  </div>
                  <span style={{ fontSize: 10, color: theme.textDim, ...styles.mono }}>
                    {timeAgo(deal.updatedAt)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
