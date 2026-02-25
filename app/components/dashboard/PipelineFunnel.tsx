"use client";
import { theme, styles } from "../theme";
import { DEAL_STAGES } from "../../utils/dealHelpers";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import type { Deal } from "../../types/deal";

interface PipelineFunnelProps {
  deals: Deal[];
  router: AppRouterInstance;
  isMobile: boolean;
}

export default function PipelineFunnel({ deals, router, isMobile }: PipelineFunnelProps) {
  return (
    <div style={styles.card} role="region" aria-label="Pipeline funnel">
      <div style={{ ...styles.flexBetween, marginBottom: 12 }}>
        <h3 style={styles.sectionHeading as React.CSSProperties}>Pipeline Funnel</h3>
        <button onClick={() => router.push("/pipeline")} aria-label="View all pipeline deals" style={styles.linkBtn as React.CSSProperties}>View all →</button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {DEAL_STAGES.map((stage) => {
          const count = deals.filter((d) => d.stage === stage.key).length;
          const pctOfTotal = deals.length > 0 ? (count / deals.length) * 100 : 0;
          return (
            <div key={stage.key} onClick={() => router.push("/pipeline")} role="button" tabIndex={0} aria-label={`${stage.label}: ${count} ${count === 1 ? "deal" : "deals"}`} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") router.push("/pipeline"); }} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", padding: "4px 0" }}>
              <div style={{ width: 70, fontSize: 10, color: stage.color, fontWeight: 600 }}>{stage.label}</div>
              <div style={{ flex: 1, height: 16, background: theme.input, borderRadius: 3, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${pctOfTotal}%`, background: stage.color, borderRadius: 3, opacity: 0.7, transition: "width 0.4s", minWidth: count > 0 ? 4 : 0 }} />
              </div>
              <div style={{ width: 20, fontSize: 12, fontWeight: 700, color: stage.color, textAlign: "right", ...styles.mono }}>{count}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
