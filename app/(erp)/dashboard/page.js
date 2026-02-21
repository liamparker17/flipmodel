"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { theme, fmt, pct } from "../../components/theme";
import KPICard from "../../components/KPICard";
import DealCard from "../../components/DealCard";
import useDeals from "../../hooks/useDeals";
import { DEAL_STAGES, computeDealMetrics } from "../../utils/dealHelpers";

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
  const recentDeals = [...deals].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)).slice(0, 5);

  let totalInvested = 0;
  let totalProjectedProfit = 0;
  let scoreDistribution = { strong: 0, marginal: 0, risky: 0 };

  for (const deal of deals) {
    const m = computeDealMetrics(deal.data);
    if (m) {
      totalInvested += m.purchasePrice;
      totalProjectedProfit += m.estimatedProfit;
    }
  }

  const handleNewDeal = () => {
    const deal = createDeal("New Deal");
    router.push(`/pipeline/${deal.id}`);
  };

  return (
    <div style={{ padding: isMobile ? 16 : 32, maxWidth: 1200, margin: "0 auto" }}>
      {/* Page header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, paddingLeft: isMobile ? 48 : 0 }}>
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
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 32 }}>
        <KPICard label="Total Deals" value={deals.length} icon="D" color={theme.accent} sub={`${activeDeals.length} active`} />
        <KPICard label="Active Renovations" value={renovating.length} icon="W" color={theme.orange} sub="Purchased + Renovating" />
        <KPICard label="Total Invested" value={fmt(totalInvested)} icon="R" color={theme.text} sub="Across all deals" />
        <KPICard label="Projected Profit" value={fmt(totalProjectedProfit)} icon="$" color={totalProjectedProfit >= 0 ? theme.green : theme.red} sub="Estimated total" />
      </div>

      {/* Quick Actions */}
      <div style={{ display: "flex", gap: 12, marginBottom: 32, flexWrap: "wrap" }}>
        <button onClick={handleNewDeal} style={{
          background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 10,
          padding: "14px 20px", color: theme.text, fontSize: 13, cursor: "pointer", minHeight: 44,
        }}>+ New Deal Analysis</button>
        <button onClick={() => router.push("/pipeline")} style={{
          background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 10,
          padding: "14px 20px", color: theme.text, fontSize: 13, cursor: "pointer", minHeight: 44,
        }}>View Pipeline</button>
        <button onClick={() => router.push("/finance")} style={{
          background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 10,
          padding: "14px 20px", color: theme.text, fontSize: 13, cursor: "pointer", minHeight: 44,
        }}>View Financials</button>
      </div>

      {/* Pipeline Summary */}
      <div style={{
        background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 12,
        padding: 20, marginBottom: 24,
      }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: theme.accent, textTransform: "uppercase", letterSpacing: 1.5, margin: "0 0 16px" }}>
          Pipeline Summary
        </h3>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {DEAL_STAGES.map((stage) => {
            const count = deals.filter((d) => d.stage === stage.key).length;
            return (
              <div key={stage.key} style={{
                background: `${stage.color}12`, border: `1px solid ${stage.color}30`,
                borderRadius: 8, padding: "10px 16px", minWidth: 100, textAlign: "center",
              }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: stage.color, fontFamily: "'JetBrains Mono', monospace" }}>{count}</div>
                <div style={{ fontSize: 11, color: theme.textDim, marginTop: 2 }}>{stage.label}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Deals */}
      <div style={{
        background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 12,
        padding: 20,
      }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: theme.accent, textTransform: "uppercase", letterSpacing: 1.5, margin: "0 0 16px" }}>
          Recent Deals
        </h3>
        {recentDeals.length === 0 ? (
          <p style={{ fontSize: 13, color: theme.textDim }}>No deals yet. Create your first deal to get started.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {recentDeals.map((deal) => (
              <DealCard key={deal.id} deal={deal} compact />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
