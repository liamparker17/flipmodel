"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { theme, fmt, pct } from "../../components/theme";
import useDeals from "../../hooks/useDeals";
import { DEAL_STAGES } from "../../utils/dealHelpers";
import type { Deal, DealMetrics } from "../../types/deal";

function computeQuickMetrics(deal: Deal): DealMetrics {
  const pp = deal.purchasePrice || deal.data?.acq?.purchasePrice || 0;
  const sp = deal.expectedSalePrice || deal.data?.resale?.expectedPrice || 0;
  const reno = deal.data?.quickRenoEstimate || 0;
  const months = deal.data?.holding?.renovationMonths || 4;
  const profit = sp - pp - reno;
  return {
    purchasePrice: pp,
    expectedPrice: sp,
    renovationMonths: months,
    estimatedProfit: profit,
    estimatedRoi: pp > 0 ? profit / pp : 0,
  };
}

export default function DashboardPage() {
  const router = useRouter();
  const { deals, loaded, createDeal } = useDeals();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  if (!loaded) return <div style={{ padding: 40, color: theme.textDim }}>Loading...</div>;

  const activeDeals = deals.filter((d) => d.stage !== "sold");
  const renovating = deals.filter((d) => d.stage === "purchased" || d.stage === "renovating");

  let totalInvested = 0;
  let totalProfit = 0;
  let totalRoi = 0;
  let roiCount = 0;

  for (const deal of deals) {
    const m = computeQuickMetrics(deal);
    totalInvested += m.purchasePrice;
    totalProfit += m.estimatedProfit;
    if (m.estimatedRoi !== 0) {
      totalRoi += m.estimatedRoi;
      roiCount++;
    }
  }

  const avgRoi = roiCount > 0 ? totalRoi / roiCount : 0;
  const recentDeals = [...deals].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 5);

  const handleNewDeal = () => {
    const deal = createDeal("New Deal");
    router.push(`/pipeline/${deal.id}`);
  };

  return (
    <div style={{ padding: isMobile ? 16 : 28, maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, paddingLeft: isMobile ? 48 : 0 }}>
        <div>
          <h1 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 600, margin: 0, color: theme.text }}>Dashboard</h1>
          <p style={{ fontSize: 12, color: theme.textDim, margin: "2px 0 0" }}>Overview of your property portfolio</p>
        </div>
        <button onClick={handleNewDeal} style={{
          background: theme.accent, color: "#fff", border: "none", borderRadius: 6,
          padding: "8px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer", minHeight: 36,
        }}>+ New Deal</button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr 1fr", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Total Deals", value: String(deals.length), sub: `${activeDeals.length} active`, color: theme.accent },
          { label: "Active Projects", value: String(renovating.length), sub: "In progress", color: theme.orange },
          { label: "Average ROI", value: pct(avgRoi), sub: "Across all deals", color: avgRoi >= 0.15 ? theme.green : theme.orange },
          { label: "Expected Profit", value: fmt(totalProfit), sub: "Portfolio total", color: totalProfit >= 0 ? theme.green : theme.red },
        ].map((kpi) => (
          <div key={kpi.label} style={{
            background: theme.card, border: `1px solid ${theme.cardBorder}`,
            borderRadius: 8, padding: 16,
          }}>
            <div style={{ fontSize: 10, color: theme.textDim, textTransform: "uppercase", letterSpacing: 0.6, fontWeight: 500, marginBottom: 8 }}>{kpi.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: kpi.color, fontFamily: "'JetBrains Mono', monospace", marginBottom: 2 }}>{kpi.value}</div>
            <div style={{ fontSize: 11, color: theme.textDim }}>{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* Pipeline Summary */}
      <div style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 8, padding: 16, marginBottom: 16 }}>
        <h3 style={{ fontSize: 11, fontWeight: 600, color: theme.textDim, textTransform: "uppercase", letterSpacing: 0.8, margin: "0 0 12px" }}>Pipeline Summary</h3>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {DEAL_STAGES.map((stage) => {
            const count = deals.filter((d) => d.stage === stage.key).length;
            return (
              <div key={stage.key} style={{
                background: `${stage.color}08`, border: `1px solid ${stage.color}25`,
                borderRadius: 6, padding: "8px 14px", minWidth: 90, textAlign: "center", cursor: "pointer",
                transition: "border-color 0.15s",
              }} onClick={() => router.push("/pipeline")}>
                <div style={{ fontSize: 18, fontWeight: 700, color: stage.color, fontFamily: "'JetBrains Mono', monospace" }}>{count}</div>
                <div style={{ fontSize: 10, color: theme.textDim, marginTop: 1 }}>{stage.label}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Deals */}
      <div style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 8, padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <h3 style={{ fontSize: 11, fontWeight: 600, color: theme.textDim, textTransform: "uppercase", letterSpacing: 0.8, margin: 0 }}>Recent Deals</h3>
          <button onClick={() => router.push("/pipeline")} style={{
            background: "transparent", border: "none", color: theme.accent, fontSize: 12, cursor: "pointer", padding: 0, fontWeight: 500, minHeight: "auto", minWidth: "auto",
          }}>View all</button>
        </div>
        {recentDeals.length === 0 ? (
          <p style={{ fontSize: 12, color: theme.textDim }}>No deals yet. Create your first deal to get started.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {recentDeals.map((deal) => {
              const m = computeQuickMetrics(deal);
              const stageInfo = DEAL_STAGES.find((s) => s.key === deal.stage);
              return (
                <div
                  key={deal.id}
                  onClick={() => router.push(`/pipeline/${deal.id}`)}
                  style={{
                    background: theme.input, borderRadius: 6, padding: "10px 12px",
                    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between",
                    borderLeft: `3px solid ${stageInfo?.color || theme.textDim}`,
                    transition: "background 0.1s",
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: theme.text }}>{deal.name}</div>
                    <div style={{ fontSize: 11, color: theme.textDim }}>{deal.address || "No address"}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: m.estimatedProfit >= 0 ? theme.green : theme.red, fontFamily: "'JetBrains Mono', monospace" }}>{fmt(m.estimatedProfit)}</div>
                      <div style={{ fontSize: 10, color: theme.textDim }}>est. profit</div>
                    </div>
                    <span style={{
                      fontSize: 9, fontWeight: 600, color: stageInfo?.color,
                      background: `${stageInfo?.color}15`, padding: "2px 6px", borderRadius: 4,
                      textTransform: "uppercase", letterSpacing: 0.3,
                    }}>{stageInfo?.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
