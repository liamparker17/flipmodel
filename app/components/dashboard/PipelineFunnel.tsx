"use client";
import { theme, styles } from "../theme";
import { DEAL_STAGES } from "../../utils/dealHelpers";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

interface PipelineFunnelProps {
  deals: any[];
  router: AppRouterInstance;
  isMobile: boolean;
}

export default function PipelineFunnel({ deals, router, isMobile }: PipelineFunnelProps) {
  return (
    <div style={styles.card}>
      <div style={{ ...styles.flexBetween, marginBottom: 12 }}>
        <h3 style={styles.sectionHeading as React.CSSProperties}>Pipeline Funnel</h3>
        <button onClick={() => router.push("/pipeline")} style={styles.linkBtn as React.CSSProperties}>View all →</button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {DEAL_STAGES.map((stage) => {
          const count = deals.filter((d) => d.stage === stage.key).length;
          const pctOfTotal = deals.length > 0 ? (count / deals.length) * 100 : 0;
          return (
            <div key={stage.key} onClick={() => router.push("/pipeline")} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", padding: "4px 0" }}>
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
