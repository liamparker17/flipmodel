"use client";
import { theme, styles } from "../theme";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

interface Deadline {
  deal: string;
  dealId: string;
  dealStage: string;
  milestone: string;
  dueDate: string;
  status: string;
  overdue: boolean;
}

interface DeadlinesListProps {
  upcomingDeadlines: Deadline[];
  router: AppRouterInstance;
}

export default function DeadlinesList({ upcomingDeadlines, router }: DeadlinesListProps) {
  return (
    <div style={styles.card}>
      <h3 style={{ ...styles.sectionHeading as React.CSSProperties, margin: "0 0 12px" }}>Upcoming Deadlines</h3>
      {upcomingDeadlines.length === 0 ? (
        <p style={{ fontSize: 12, color: theme.textDim, margin: 0 }}>No upcoming deadlines. Add milestones to your properties.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 220, overflowY: "auto" }}>
          {upcomingDeadlines.slice(0, 8).map((dl, i) => (
            <div key={i} onClick={() => router.push(dl.dealStage === "purchased" || dl.dealStage === "renovating" ? `/projects/${dl.dealId}` : `/pipeline/${dl.dealId}`)} style={{
              display: "flex", alignItems: "center", gap: 8, padding: "6px 8px",
              background: dl.overdue ? `${theme.red}08` : theme.input, borderRadius: 4,
              borderLeft: `3px solid ${dl.overdue ? theme.red : theme.accent}`,
              cursor: "pointer",
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: theme.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{dl.milestone}</div>
                <div style={{ fontSize: 10, color: theme.textDim }}>{dl.deal}</div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: dl.overdue ? theme.red : theme.textDim, ...styles.mono }}>
                  {new Date(dl.dueDate).toLocaleDateString("en-ZA", { day: "numeric", month: "short" })}
                </div>
                {dl.overdue && <div style={{ fontSize: 8, color: theme.red, fontWeight: 700, textTransform: "uppercase" }}>Overdue</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
