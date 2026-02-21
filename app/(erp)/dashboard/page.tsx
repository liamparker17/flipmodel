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
    <div style={{ padding: isMobile ? 16 : 32, maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28, paddingLeft: isMobile ? 48 : 0 }}>
        <div>
          <h1 style={{ fontSize: isMobile ? 22 : 28, fontWeight: 700, margin: 0 }}>Dashboard</h1>
          <p style={{ fontSize: 13, color: theme.textDim, margin: "4px 0 0" }}>Overview of your property deals</p>
        </div>
        <button onClick={handleNewDeal} style={{
          background: theme.accent, color: "#000", border: "none", borderRadius: 8,
          padding: "10px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer", minHeight: 40,
        }}>+ New Deal</button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr 1fr", gap: 16, marginBottom: 32 }}>
        {[
          { label: "Total Deals", value: String(deals.length), sub: `${activeDeals.length} active`, color: theme.accent, icon: "D" },
          { label: "Active Projects", value: String(renovating.length), sub: "Purchased + Renovating", color: theme.orange, icon: "W" },
          { label: "Average ROI", value: pct(avgRoi), sub: "Across all deals", color: avgRoi >= 0.15 ? theme.green : theme.orange, icon: "%" },
          { label: "Total Expected Profit", value: fmt(totalProfit), sub: "Estimated total", color: totalProfit >= 0 ? theme.green : theme.red, icon: "$" },
        ].map((kpi) => (
          <div key={kpi.label} style={{
            background: theme.card, border: `1px solid ${theme.cardBorder}`,
            borderRadius: 12, padding: 20,
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <span style={{ fontSize: 11, color: theme.textDim, textTransform: "uppercase", letterSpacing: 1 }}>{kpi.label}</span>
              <span style={{
                width: 32, height: 32, borderRadius: 8, background: `${kpi.color}18`, color: kpi.color,
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700,
              }}>{kpi.icon}</span>
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, color: kpi.color, fontFamily: "'JetBrains Mono', monospace", marginBottom: 4 }}>{kpi.value}</div>
            <div style={{ fontSize: 12, color: theme.textDim }}>{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* Pipeline Summary */}
      <div style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 12, padding: 20, marginBottom: 24 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: theme.accent, textTransform: "uppercase", letterSpacing: 1.5, margin: "0 0 16px" }}>Pipeline Summary</h3>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {DEAL_STAGES.map((stage) => {
            const count = deals.filter((d) => d.stage === stage.key).length;
            return (
              <div key={stage.key} style={{
                background: `${stage.color}12`, border: `1px solid ${stage.color}30`,
                borderRadius: 8, padding: "10px 16px", minWidth: 100, textAlign: "center", cursor: "pointer",
              }} onClick={() => router.push("/pipeline")}>
                <div style={{ fontSize: 20, fontWeight: 700, color: stage.color, fontFamily: "'JetBrains Mono', monospace" }}>{count}</div>
                <div style={{ fontSize: 11, color: theme.textDim, marginTop: 2 }}>{stage.label}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Deals */}
      <div style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 12, padding: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: theme.accent, textTransform: "uppercase", letterSpacing: 1.5, margin: "0 0 16px" }}>Recent Deals</h3>
        {recentDeals.length === 0 ? (
          <p style={{ fontSize: 13, color: theme.textDim }}>No deals yet. Create your first deal to get started.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {recentDeals.map((deal) => {
              const m = computeQuickMetrics(deal);
              const stageInfo = DEAL_STAGES.find((s) => s.key === deal.stage);
              return (
                <div
                  key={deal.id}
                  onClick={() => router.push(`/pipeline/${deal.id}`)}
                  style={{
                    background: theme.input, borderRadius: 8, padding: "12px 16px",
                    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between",
                    borderLeft: `3px solid ${stageInfo?.color || theme.textDim}`,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: theme.text }}>{deal.name}</div>
                    <div style={{ fontSize: 11, color: theme.textDim }}>{deal.address || "No address"}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: m.estimatedProfit >= 0 ? theme.green : theme.red, fontFamily: "'JetBrains Mono', monospace" }}>{fmt(m.estimatedProfit)}</div>
                      <div style={{ fontSize: 10, color: theme.textDim }}>est. profit</div>
                    </div>
                    <span style={{
                      fontSize: 10, fontWeight: 600, color: stageInfo?.color,
                      background: `${stageInfo?.color}18`, padding: "3px 8px", borderRadius: 6,
                      textTransform: "uppercase",
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
