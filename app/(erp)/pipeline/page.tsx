"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { theme, fmt } from "../../components/theme";
import useDeals from "../../hooks/useDeals";
import { DEAL_STAGES, groupDealsByStage } from "../../utils/dealHelpers";
import type { Deal } from "../../types/deal";

function DealPipelineCard({ deal }: { deal: Deal }) {
  const router = useRouter();
  const pp = deal.purchasePrice || deal.data?.acq?.purchasePrice || 0;
  const sp = deal.expectedSalePrice || deal.data?.resale?.expectedPrice || 0;
  const profit = sp - pp - (deal.data?.quickRenoEstimate || 0);
  const stageInfo = DEAL_STAGES.find((s) => s.key === deal.stage);

  return (
    <div
      onClick={() => router.push(`/pipeline/${deal.id}`)}
      style={{
        background: theme.input, borderRadius: 6, padding: "8px 10px", cursor: "pointer",
        borderLeft: `3px solid ${stageInfo?.color || theme.textDim}`,
        transition: "background 0.1s",
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 600, color: theme.text, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {deal.name}
      </div>
      <div style={{ display: "flex", gap: 12 }}>
        <div>
          <div style={{ fontSize: 9, color: theme.textDim, textTransform: "uppercase" }}>Price</div>
          <div style={{ fontSize: 11, fontWeight: 600, color: theme.text, fontFamily: "'JetBrains Mono', monospace" }}>{fmt(pp)}</div>
        </div>
        <div>
          <div style={{ fontSize: 9, color: theme.textDim, textTransform: "uppercase" }}>Profit</div>
          <div style={{ fontSize: 11, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", color: profit >= 0 ? theme.green : theme.red }}>{fmt(profit)}</div>
        </div>
      </div>
    </div>
  );
}

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

  return (
    <div style={{ padding: isMobile ? 16 : 28, maxWidth: 1400, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, paddingLeft: isMobile ? 48 : 0 }}>
        <div>
          <h1 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 600, margin: 0, color: theme.text }}>Pipeline</h1>
          <p style={{ fontSize: 12, color: theme.textDim, margin: "2px 0 0" }}>{deals.length} deals total</p>
        </div>
        <button onClick={handleNewDeal} style={{
          background: theme.accent, color: "#fff", border: "none", borderRadius: 6,
          padding: "8px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer", minHeight: 36,
        }}>+ New Deal</button>
      </div>

      {isMobile ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {DEAL_STAGES.map((stage) => {
            const stageDeals = grouped[stage.key] || [];
            if (stageDeals.length === 0) return null;
            return (
              <div key={stage.key}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: stage.color }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: theme.text }}>{stage.label}</span>
                  <span style={{ fontSize: 11, color: theme.textDim }}>({stageDeals.length})</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {stageDeals.map((deal) => <DealPipelineCard key={deal.id} deal={deal} />)}
                </div>
              </div>
            );
          })}
          {deals.length === 0 && (
            <div style={{ textAlign: "center", padding: 40, color: theme.textDim }}>
              <p style={{ marginBottom: 12, fontSize: 13 }}>No deals in your pipeline yet.</p>
              <button onClick={handleNewDeal} style={{ background: theme.accent, color: "#fff", border: "none", borderRadius: 6, padding: "8px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Create Your First Deal</button>
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 16 }}>
          {DEAL_STAGES.map((stage) => {
            const stageDeals = grouped[stage.key] || [];
            return (
              <div key={stage.key} style={{
                minWidth: 200, maxWidth: 260, flex: 1,
                background: theme.card, border: `1px solid ${theme.cardBorder}`,
                borderRadius: 8, display: "flex", flexDirection: "column",
              }}>
                <div style={{ padding: "10px 12px", borderBottom: `2px solid ${stage.color}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: stage.color }} />
                    <span style={{ fontSize: 11, fontWeight: 600, color: theme.text }}>{stage.label}</span>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 600, color: stage.color, background: `${stage.color}15`, padding: "1px 6px", borderRadius: 3 }}>{stageDeals.length}</span>
                </div>
                <div style={{ padding: 6, flex: 1, display: "flex", flexDirection: "column", gap: 4, minHeight: 60 }}>
                  {stageDeals.map((deal) => <DealPipelineCard key={deal.id} deal={deal} />)}
                  {stageDeals.length === 0 && (
                    <div style={{ fontSize: 10, color: theme.textDim, textAlign: "center", padding: "16px 8px" }}>No deals</div>
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
