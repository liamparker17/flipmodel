"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { theme, fmt } from "../../../components/theme";
import useDeals from "../../../hooks/useDeals";
import { getStageColor, getStageLabel } from "../../../utils/dealHelpers";
import type { Deal } from "../../../types/deal";

export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const router = useRouter();
  const { getDeal } = useDeals();
  const [deal, setDeal] = useState<Deal | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    const d = getDeal(projectId);
    if (d) setDeal(d);
  }, [projectId, getDeal]);

  if (!deal) {
    return (
      <div style={{ padding: 40, color: theme.textDim }}>
        <p>Project not found.</p>
        <button onClick={() => router.push("/projects")} style={{ background: theme.accent, color: "#000", border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer", marginTop: 12 }}>
          Back to Projects
        </button>
      </div>
    );
  }

  const stageColor = getStageColor(deal.stage);
  const pp = deal.purchasePrice || deal.data?.acq?.purchasePrice || 0;
  const sp = deal.expectedSalePrice || deal.data?.resale?.expectedPrice || 0;
  const reno = deal.data?.quickRenoEstimate || 0;
  const profit = sp - pp - reno;
  const months = deal.data?.holding?.renovationMonths || 4;

  return (
    <div style={{ padding: isMobile ? 16 : 32, maxWidth: 1000, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24, paddingLeft: isMobile ? 48 : 0 }}>
        <button onClick={() => router.push("/projects")} style={{
          background: theme.input, border: `1px solid ${theme.inputBorder}`, borderRadius: 6,
          width: 36, height: 36, color: theme.textDim, fontSize: 16, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>&larr;</button>
        <div>
          <h1 style={{ fontSize: isMobile ? 22 : 28, fontWeight: 700, margin: 0 }}>{deal.name}</h1>
          <div style={{ fontSize: 12, color: theme.textDim, marginTop: 2 }}>{deal.address || "No address"}</div>
        </div>
        <span style={{
          fontSize: 11, fontWeight: 600, color: stageColor,
          background: `${stageColor}18`, padding: "4px 12px", borderRadius: 6, textTransform: "uppercase", marginLeft: "auto",
        }}>{getStageLabel(deal.stage)}</span>
      </div>

      {/* Key Metrics */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr 1fr", gap: 16, marginBottom: 24 }}>
        {[
          { label: "Purchase Price", value: fmt(pp), color: theme.text },
          { label: "Reno Budget", value: fmt(reno), color: theme.orange },
          { label: "Expected Sale", value: fmt(sp), color: theme.accent },
          { label: "Est. Profit", value: fmt(profit), color: profit >= 0 ? theme.green : theme.red },
        ].map((m) => (
          <div key={m.label} style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 12, padding: 16 }}>
            <div style={{ fontSize: 10, color: theme.textDim, textTransform: "uppercase", marginBottom: 6 }}>{m.label}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: m.color, fontFamily: "'JetBrains Mono', monospace" }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* Timeline */}
      <div style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 12, padding: 20, marginBottom: 24 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: theme.accent, textTransform: "uppercase", letterSpacing: 1.5, margin: "0 0 16px" }}>Renovation Timeline</h3>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ flex: 1, height: 8, background: theme.input, borderRadius: 4, overflow: "hidden" }}>
            <div style={{ width: "45%", height: "100%", background: theme.accent, borderRadius: 4 }} />
          </div>
          <span style={{ fontSize: 13, fontWeight: 600, color: theme.accent }}>{months} months</span>
        </div>
        <div style={{ fontSize: 12, color: theme.textDim, marginTop: 8 }}>Progress tracking coming soon</div>
      </div>

      {/* Contractors */}
      <div style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 12, padding: 20, marginBottom: 24 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: theme.accent, textTransform: "uppercase", letterSpacing: 1.5, margin: "0 0 16px" }}>Contractors</h3>
        {deal.data?.contractors && deal.data.contractors.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {deal.data.contractors.map((c, i) => (
              <div key={i} style={{ background: theme.input, borderRadius: 8, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: theme.text }}>{c.name || "Unnamed"}</div>
                  <div style={{ fontSize: 11, color: theme.textDim }}>{c.profession}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: theme.accent, fontFamily: "'JetBrains Mono', monospace" }}>{fmt(c.dailyRate * c.daysWorked)}</div>
                  <div style={{ fontSize: 10, color: theme.textDim }}>{c.daysWorked} days</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ fontSize: 13, color: theme.textDim }}>No contractors assigned yet.</p>
        )}
      </div>

      {/* Notes */}
      {deal.notes && (
        <div style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 12, padding: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: theme.accent, textTransform: "uppercase", letterSpacing: 1.5, margin: "0 0 12px" }}>Notes</h3>
          <p style={{ fontSize: 13, color: theme.text, lineHeight: 1.6, margin: 0, whiteSpace: "pre-wrap" }}>{deal.notes}</p>
        </div>
      )}

      {/* Link to full deal analysis */}
      <div style={{ marginTop: 24, textAlign: "center" }}>
        <button onClick={() => router.push(`/pipeline/${deal.id}`)} style={{
          background: theme.accent, color: "#000", border: "none", borderRadius: 8,
          padding: "12px 24px", fontSize: 14, fontWeight: 700, cursor: "pointer",
        }}>Open Full Analysis</button>
      </div>
    </div>
  );
}
