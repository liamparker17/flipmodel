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
        <button onClick={() => router.push("/projects")} style={{ background: theme.accent, color: "#fff", border: "none", borderRadius: 6, padding: "8px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer", marginTop: 12 }}>
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
    <div style={{ padding: isMobile ? 16 : 28, maxWidth: 1000, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, paddingLeft: isMobile ? 48 : 0 }}>
        <button onClick={() => router.push("/projects")} style={{
          background: theme.input, border: `1px solid ${theme.inputBorder}`, borderRadius: 6,
          width: 32, height: 32, color: theme.textDim, fontSize: 14, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>&larr;</button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 600, margin: 0, color: theme.text }}>{deal.name}</h1>
          <div style={{ fontSize: 11, color: theme.textDim, marginTop: 1 }}>{deal.address || "No address"}</div>
        </div>
        <span style={{
          fontSize: 9, fontWeight: 600, color: stageColor,
          background: `${stageColor}15`, padding: "3px 10px", borderRadius: 4, textTransform: "uppercase",
        }}>{getStageLabel(deal.stage)}</span>
      </div>

      {/* Key Metrics */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
        {[
          { label: "Purchase Price", value: fmt(pp), color: theme.text },
          { label: "Reno Budget", value: fmt(reno), color: theme.orange },
          { label: "Expected Sale", value: fmt(sp), color: theme.accent },
          { label: "Est. Profit", value: fmt(profit), color: profit >= 0 ? theme.green : theme.red },
        ].map((m) => (
          <div key={m.label} style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 8, padding: 14 }}>
            <div style={{ fontSize: 9, color: theme.textDim, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>{m.label}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: m.color, fontFamily: "'JetBrains Mono', monospace" }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* Timeline */}
      <div style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 8, padding: 16, marginBottom: 16 }}>
        <h3 style={{ fontSize: 11, fontWeight: 600, color: theme.textDim, textTransform: "uppercase", letterSpacing: 0.8, margin: "0 0 12px" }}>Renovation Timeline</h3>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ flex: 1, height: 6, background: theme.input, borderRadius: 3, overflow: "hidden" }}>
            <div style={{ width: "45%", height: "100%", background: theme.accent, borderRadius: 3 }} />
          </div>
          <span style={{ fontSize: 12, fontWeight: 600, color: theme.accent }}>{months} mo</span>
        </div>
        <div style={{ fontSize: 11, color: theme.textDim, marginTop: 6 }}>Progress tracking coming soon</div>
      </div>

      {/* Contractors */}
      <div style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 8, padding: 16, marginBottom: 16 }}>
        <h3 style={{ fontSize: 11, fontWeight: 600, color: theme.textDim, textTransform: "uppercase", letterSpacing: 0.8, margin: "0 0 12px" }}>Contractors</h3>
        {deal.data?.contractors && deal.data.contractors.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {deal.data.contractors.map((c, i) => (
              <div key={i} style={{ background: theme.input, borderRadius: 6, padding: "8px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: theme.text }}>{c.name || "Unnamed"}</div>
                  <div style={{ fontSize: 10, color: theme.textDim }}>{c.profession}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: theme.accent, fontFamily: "'JetBrains Mono', monospace" }}>{fmt(c.dailyRate * c.daysWorked)}</div>
                  <div style={{ fontSize: 9, color: theme.textDim }}>{c.daysWorked} days</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ fontSize: 12, color: theme.textDim, margin: 0 }}>No contractors assigned yet.</p>
        )}
      </div>

      {/* Notes */}
      {deal.notes && (
        <div style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 8, padding: 16, marginBottom: 16 }}>
          <h3 style={{ fontSize: 11, fontWeight: 600, color: theme.textDim, textTransform: "uppercase", letterSpacing: 0.8, margin: "0 0 8px" }}>Notes</h3>
          <p style={{ fontSize: 12, color: theme.text, lineHeight: 1.6, margin: 0, whiteSpace: "pre-wrap" }}>{deal.notes}</p>
        </div>
      )}

      <div style={{ textAlign: "center" }}>
        <button onClick={() => router.push(`/pipeline/${deal.id}`)} style={{
          background: theme.accent, color: "#fff", border: "none", borderRadius: 6,
          padding: "8px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer",
        }}>Open Full Analysis</button>
      </div>
    </div>
  );
}
