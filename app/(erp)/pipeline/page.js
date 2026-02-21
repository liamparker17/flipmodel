"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { theme } from "../../components/theme";
import DealCard from "../../components/DealCard";
import useDeals from "../../hooks/useDeals";
import { DEAL_STAGES, groupDealsByStage } from "../../utils/dealHelpers";

export default function PipelinePage() {
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

  const grouped = groupDealsByStage(deals);

  const handleNewDeal = () => {
    const deal = createDeal("New Deal");
    router.push(`/pipeline/${deal.id}`);
  };

  // Desktop: horizontal kanban columns; Mobile: stacked sections
  return (
    <div style={{ padding: isMobile ? 16 : 32, maxWidth: 1400, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, paddingLeft: isMobile ? 48 : 0 }}>
        <div>
          <h1 style={{ fontSize: isMobile ? 22 : 28, fontWeight: 700, margin: 0 }}>Pipeline</h1>
          <p style={{ fontSize: 13, color: theme.textDim, margin: "4px 0 0" }}>{deals.length} deals total</p>
        </div>
        <button onClick={handleNewDeal} style={{
          background: theme.accent, color: "#000", border: "none", borderRadius: 8,
          padding: "10px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer", minHeight: 40,
        }}>+ New Deal</button>
      </div>

      {isMobile ? (
        // Mobile: stacked sections
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {DEAL_STAGES.map((stage) => {
            const stageDeals = grouped[stage.key];
            if (stageDeals.length === 0) return null;
            return (
              <div key={stage.key}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: stage.color }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: theme.text }}>{stage.label}</span>
                  <span style={{ fontSize: 12, color: theme.textDim }}>({stageDeals.length})</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {stageDeals.map((deal) => <DealCard key={deal.id} deal={deal} />)}
                </div>
              </div>
            );
          })}
          {deals.length === 0 && (
            <div style={{ textAlign: "center", padding: 40, color: theme.textDim }}>
              <p style={{ marginBottom: 16 }}>No deals in your pipeline yet.</p>
              <button onClick={handleNewDeal} style={{
                background: theme.accent, color: "#000", border: "none", borderRadius: 8,
                padding: "12px 24px", fontSize: 14, fontWeight: 700, cursor: "pointer",
              }}>Create Your First Deal</button>
            </div>
          )}
        </div>
      ) : (
        // Desktop: kanban columns
        <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 16 }}>
          {DEAL_STAGES.map((stage) => {
            const stageDeals = grouped[stage.key];
            return (
              <div key={stage.key} style={{
                minWidth: 220, maxWidth: 280, flex: 1,
                background: theme.card, border: `1px solid ${theme.cardBorder}`,
                borderRadius: 10, display: "flex", flexDirection: "column",
              }}>
                {/* Column header */}
                <div style={{
                  padding: "12px 14px", borderBottom: `2px solid ${stage.color}`,
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: stage.color }} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: theme.text }}>{stage.label}</span>
                  </div>
                  <span style={{
                    fontSize: 11, fontWeight: 600, color: stage.color,
                    background: `${stage.color}18`, padding: "2px 8px", borderRadius: 4,
                  }}>{stageDeals.length}</span>
                </div>
                {/* Cards */}
                <div style={{ padding: 8, flex: 1, display: "flex", flexDirection: "column", gap: 6, minHeight: 80 }}>
                  {stageDeals.map((deal) => <DealCard key={deal.id} deal={deal} compact />)}
                  {stageDeals.length === 0 && (
                    <div style={{ fontSize: 11, color: theme.textDim, textAlign: "center", padding: "20px 8px" }}>
                      No deals
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
