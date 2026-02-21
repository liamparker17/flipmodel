"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { theme, fmt } from "../../components/theme";
import useDeals from "../../hooks/useDeals";
import { getStageColor, getStageLabel } from "../../utils/dealHelpers";
import type { Deal } from "../../types/deal";

export default function ProjectsPage() {
  const router = useRouter();
  const { deals, loaded } = useDeals();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  if (!loaded) return <div style={{ padding: 40, color: theme.textDim }}>Loading...</div>;

  const projects = deals.filter((d) => d.stage === "purchased" || d.stage === "renovating");

  return (
    <div style={{ padding: isMobile ? 16 : 32, maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ marginBottom: 24, paddingLeft: isMobile ? 48 : 0 }}>
        <h1 style={{ fontSize: isMobile ? 22 : 28, fontWeight: 700, margin: 0 }}>Projects</h1>
        <p style={{ fontSize: 13, color: theme.textDim, margin: "4px 0 0" }}>Active renovations — purchased and in-progress</p>
      </div>

      {projects.length === 0 ? (
        <div style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 12, padding: 40, textAlign: "center" }}>
          <p style={{ fontSize: 15, color: theme.textDim, marginBottom: 8 }}>No active projects.</p>
          <p style={{ fontSize: 13, color: theme.textDim }}>Move deals to &ldquo;Purchased&rdquo; or &ldquo;Renovating&rdquo; stage to see them here.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16 }}>
          {projects.map((deal) => (
            <ProjectCard key={deal.id} deal={deal} onClick={() => router.push(`/projects/${deal.id}`)} />
          ))}
        </div>
      )}
    </div>
  );
}

function ProjectCard({ deal, onClick }: { deal: Deal; onClick: () => void }) {
  const stageColor = getStageColor(deal.stage);
  const pp = deal.purchasePrice || deal.data?.acq?.purchasePrice || 0;
  const sp = deal.expectedSalePrice || deal.data?.resale?.expectedPrice || 0;
  const reno = deal.data?.quickRenoEstimate || 0;
  const profit = sp - pp - reno;
  const months = deal.data?.holding?.renovationMonths || 4;

  return (
    <div onClick={onClick} style={{
      background: theme.card, border: `1px solid ${theme.cardBorder}`,
      borderRadius: 12, padding: 20, borderTop: `3px solid ${stageColor}`, cursor: "pointer",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <span style={{ fontSize: 16, fontWeight: 600, color: theme.text }}>{deal.name}</span>
        <span style={{
          fontSize: 10, fontWeight: 600, color: stageColor,
          background: `${stageColor}18`, padding: "3px 10px", borderRadius: 6, textTransform: "uppercase",
        }}>{getStageLabel(deal.stage)}</span>
      </div>
      {deal.address && <div style={{ fontSize: 12, color: theme.textDim, marginBottom: 12 }}>{deal.address}</div>}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 10, color: theme.textDim, textTransform: "uppercase" }}>Purchase Price</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: theme.text, fontFamily: "'JetBrains Mono', monospace" }}>{fmt(pp)}</div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: theme.textDim, textTransform: "uppercase" }}>Expected Sale</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: theme.text, fontFamily: "'JetBrains Mono', monospace" }}>{fmt(sp)}</div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: theme.textDim, textTransform: "uppercase" }}>Est. Profit</div>
          <div style={{ fontSize: 14, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", color: profit >= 0 ? theme.green : theme.red }}>{fmt(profit)}</div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: theme.textDim, textTransform: "uppercase" }}>Timeline</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: theme.orange }}>{months} months</div>
        </div>
      </div>
      {deal.data?.contractors && deal.data.contractors.length > 0 && (
        <div style={{ borderTop: `1px solid ${theme.cardBorder}`, paddingTop: 10 }}>
          <div style={{ fontSize: 10, color: theme.textDim, textTransform: "uppercase", marginBottom: 6 }}>Contractors</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {deal.data.contractors.map((c, i) => (
              <span key={i} style={{ fontSize: 11, color: theme.text, background: theme.input, padding: "3px 8px", borderRadius: 4 }}>
                {c.name || c.profession}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
