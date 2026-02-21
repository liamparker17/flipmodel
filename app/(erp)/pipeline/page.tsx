"use client";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { theme, fmt, pct } from "../../components/theme";
import useDeals from "../../hooks/useDeals";
import { DEAL_STAGES, groupDealsByStage, computeDealMetrics, PRIORITY_CONFIG, getDealProgress } from "../../utils/dealHelpers";
import type { Deal, DealStage } from "../../types/deal";

function DealPipelineCard({ deal, onMove }: { deal: Deal; onMove: (id: string, stage: DealStage) => void }) {
  const router = useRouter();
  const m = computeDealMetrics(deal);
  const stageInfo = DEAL_STAGES.find((s) => s.key === deal.stage);
  const stageIdx = DEAL_STAGES.findIndex((s) => s.key === deal.stage);
  const progress = getDealProgress(deal);
  const priorityConf = PRIORITY_CONFIG[deal.priority] || PRIORITY_CONFIG.medium;
  const actualExpenses = (deal.expenses || []).filter((e) => !e.isProjected).reduce((s, e) => s + e.amount, 0);
  const daysInStage = Math.floor((Date.now() - new Date(deal.updatedAt).getTime()) / (1000 * 60 * 60 * 24));

  return (
    <div style={{
      background: theme.input, borderRadius: 6, padding: "8px 10px", cursor: "pointer",
      borderLeft: `3px solid ${stageInfo?.color || theme.textDim}`,
      transition: "background 0.1s, transform 0.1s",
    }}>
      <div onClick={() => router.push(`/pipeline/${deal.id}`)}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 3 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: theme.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, minWidth: 0 }}>
            {deal.name}
          </div>
          <span style={{ fontSize: 9, color: priorityConf.color, fontWeight: 700, marginLeft: 4, flexShrink: 0 }}>{priorityConf.icon}</span>
        </div>
        {deal.address && <div style={{ fontSize: 9, color: theme.textDim, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{deal.address}</div>}
        <div style={{ display: "flex", gap: 10, marginBottom: 4 }}>
          <div>
            <div style={{ fontSize: 8, color: theme.textDim, textTransform: "uppercase" }}>Price</div>
            <div style={{ fontSize: 11, fontWeight: 600, color: theme.text, fontFamily: "'JetBrains Mono', monospace" }}>{fmt(m.purchasePrice)}</div>
          </div>
          <div>
            <div style={{ fontSize: 8, color: theme.textDim, textTransform: "uppercase" }}>Profit</div>
            <div style={{ fontSize: 11, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", color: m.estimatedProfit >= 0 ? theme.green : theme.red }}>{fmt(m.estimatedProfit)}</div>
          </div>
          <div>
            <div style={{ fontSize: 8, color: theme.textDim, textTransform: "uppercase" }}>ROI</div>
            <div style={{ fontSize: 11, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", color: m.estimatedRoi >= 0.15 ? theme.green : m.estimatedRoi >= 0 ? theme.orange : theme.red }}>{pct(m.estimatedRoi)}</div>
          </div>
        </div>
        {/* Progress bar if tasks exist */}
        {progress.total > 0 && (
          <div style={{ marginBottom: 4 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 8, color: theme.textDim, marginBottom: 1 }}>
              <span>{progress.completed}/{progress.total} tasks</span>
              <span>{Math.round(progress.pct)}%</span>
            </div>
            <div style={{ height: 3, background: theme.cardBorder, borderRadius: 2, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${progress.pct}%`, background: theme.accent, borderRadius: 2 }} />
            </div>
          </div>
        )}
        {/* Tags */}
        {deal.tags && deal.tags.length > 0 && (
          <div style={{ display: "flex", gap: 3, flexWrap: "wrap", marginBottom: 4 }}>
            {deal.tags.slice(0, 3).map((tag) => (
              <span key={tag} style={{ fontSize: 8, color: theme.textDim, background: theme.cardBorder, padding: "1px 4px", borderRadius: 2 }}>{tag}</span>
            ))}
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: theme.textDim }}>
          <span>{daysInStage}d in stage</span>
          {actualExpenses > 0 && <span>{fmt(actualExpenses)} spent</span>}
        </div>
      </div>
      {/* Quick stage move buttons */}
      <div style={{ display: "flex", gap: 2, marginTop: 4, borderTop: `1px solid ${theme.cardBorder}`, paddingTop: 4 }}>
        {stageIdx > 0 && (
          <button onClick={(e) => { e.stopPropagation(); onMove(deal.id, DEAL_STAGES[stageIdx - 1].key); }} style={{
            background: "transparent", border: `1px solid ${theme.cardBorder}`, borderRadius: 3,
            padding: "2px 6px", fontSize: 8, color: theme.textDim, cursor: "pointer", flex: 1,
          }}>← {DEAL_STAGES[stageIdx - 1].label}</button>
        )}
        {stageIdx < DEAL_STAGES.length - 1 && (
          <button onClick={(e) => { e.stopPropagation(); onMove(deal.id, DEAL_STAGES[stageIdx + 1].key); }} style={{
            background: `${DEAL_STAGES[stageIdx + 1].color}12`, border: `1px solid ${DEAL_STAGES[stageIdx + 1].color}25`, borderRadius: 3,
            padding: "2px 6px", fontSize: 8, color: DEAL_STAGES[stageIdx + 1].color, cursor: "pointer", flex: 1, fontWeight: 600,
          }}>{DEAL_STAGES[stageIdx + 1].label} →</button>
        )}
      </div>
    </div>
  );
}

export default function PipelinePage() {
  const router = useRouter();
  const { deals, loaded, createDeal, moveDeal } = useDeals();
  const [isMobile, setIsMobile] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"updated" | "price" | "profit" | "name">("updated");
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [hideSold, setHideSold] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const filteredDeals = useMemo(() => {
    let result = [...deals];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((d) => d.name.toLowerCase().includes(q) || d.address.toLowerCase().includes(q) || (d.tags || []).some((t) => t.toLowerCase().includes(q)));
    }
    if (filterPriority !== "all") {
      result = result.filter((d) => d.priority === filterPriority);
    }
    if (hideSold) {
      result = result.filter((d) => d.stage !== "sold");
    }
    switch (sortBy) {
      case "price": result.sort((a, b) => b.purchasePrice - a.purchasePrice); break;
      case "profit": result.sort((a, b) => computeDealMetrics(b).estimatedProfit - computeDealMetrics(a).estimatedProfit); break;
      case "name": result.sort((a, b) => a.name.localeCompare(b.name)); break;
      default: result.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    }
    return result;
  }, [deals, searchQuery, filterPriority, sortBy, hideSold]);

  const grouped = useMemo(() => groupDealsByStage(filteredDeals), [filteredDeals]);

  if (!loaded) return <div style={{ padding: 40, color: theme.textDim }}>Loading...</div>;

  const handleNewDeal = () => {
    const deal = createDeal("New Property");
    router.push(`/pipeline/${deal.id}`);
  };

  const handleMove = (id: string, stage: DealStage) => {
    moveDeal(id, stage);
  };

  const stages = hideSold ? DEAL_STAGES.filter((s) => s.key !== "sold") : DEAL_STAGES;

  return (
    <div style={{ padding: isMobile ? 16 : 28, maxWidth: 1600, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, paddingLeft: isMobile ? 48 : 0, flexWrap: "wrap", gap: 8 }}>
        <div>
          <h1 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 600, margin: 0, color: theme.text }}>Pipeline</h1>
          <p style={{ fontSize: 12, color: theme.textDim, margin: "2px 0 0" }}>{filteredDeals.length} propert{filteredDeals.length !== 1 ? "ies" : "y"} {searchQuery ? "(filtered)" : "total"}</p>
        </div>
        <button onClick={handleNewDeal} style={{
          background: theme.accent, color: "#fff", border: "none", borderRadius: 6,
          padding: "8px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer", minHeight: 36,
        }}>+ New Property</button>
      </div>

      {/* Toolbar */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
        {/* Search */}
        <div style={{ flex: isMobile ? "1 1 100%" : "0 1 240px" }}>
          <input
            value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search properties, addresses, tags..."
            style={{
              width: "100%", background: theme.input, border: `1px solid ${theme.inputBorder}`,
              borderRadius: 6, padding: "7px 10px", color: theme.text, fontSize: 12, outline: "none", minHeight: 34,
            }}
          />
        </div>
        {/* Priority filter */}
        <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} style={{
          background: theme.input, border: `1px solid ${theme.inputBorder}`, borderRadius: 6,
          padding: "7px 8px", color: theme.text, fontSize: 11, cursor: "pointer", minHeight: 34,
        }}>
          <option value="all">All Priorities</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        {/* Sort */}
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)} style={{
          background: theme.input, border: `1px solid ${theme.inputBorder}`, borderRadius: 6,
          padding: "7px 8px", color: theme.text, fontSize: 11, cursor: "pointer", minHeight: 34,
        }}>
          <option value="updated">Recently Updated</option>
          <option value="price">Highest Price</option>
          <option value="profit">Highest Profit</option>
          <option value="name">Name A-Z</option>
        </select>
        {/* View mode toggle */}
        {!isMobile && (
          <div style={{ display: "flex", background: theme.input, borderRadius: 6, overflow: "hidden", border: `1px solid ${theme.inputBorder}` }}>
            <button onClick={() => setViewMode("kanban")} style={{
              background: viewMode === "kanban" ? theme.accent : "transparent", color: viewMode === "kanban" ? "#000" : theme.textDim,
              border: "none", padding: "5px 10px", fontSize: 11, cursor: "pointer", fontWeight: viewMode === "kanban" ? 600 : 400, minHeight: 32,
            }}>Board</button>
            <button onClick={() => setViewMode("list")} style={{
              background: viewMode === "list" ? theme.accent : "transparent", color: viewMode === "list" ? "#000" : theme.textDim,
              border: "none", padding: "5px 10px", fontSize: 11, cursor: "pointer", fontWeight: viewMode === "list" ? 600 : 400, minHeight: 32,
            }}>List</button>
          </div>
        )}
        {/* Hide sold */}
        <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: theme.textDim, cursor: "pointer" }}>
          <input type="checkbox" checked={hideSold} onChange={(e) => setHideSold(e.target.checked)} style={{ accentColor: theme.accent }} />
          Hide Sold
        </label>
      </div>

      {/* Board View */}
      {(viewMode === "kanban" && !isMobile) ? (
        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 16 }}>
          {stages.map((stage) => {
            const stageDeals = grouped[stage.key] || [];
            const totalValue = stageDeals.reduce((s, d) => s + d.purchasePrice, 0);
            return (
              <div key={stage.key} style={{
                minWidth: 210, maxWidth: 280, flex: 1,
                background: theme.card, border: `1px solid ${theme.cardBorder}`,
                borderRadius: 8, display: "flex", flexDirection: "column",
              }}>
                <div style={{ padding: "10px 12px", borderBottom: `2px solid ${stage.color}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: stage.color }} />
                    <span style={{ fontSize: 11, fontWeight: 600, color: theme.text }}>{stage.label}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ fontSize: 10, fontWeight: 600, color: stage.color, background: `${stage.color}15`, padding: "1px 6px", borderRadius: 3 }}>{stageDeals.length}</span>
                  </div>
                </div>
                {totalValue > 0 && (
                  <div style={{ padding: "4px 12px", fontSize: 9, color: theme.textDim, fontFamily: "'JetBrains Mono', monospace", borderBottom: `1px solid ${theme.cardBorder}` }}>
                    {fmt(totalValue)} total value
                  </div>
                )}
                <div style={{ padding: 6, flex: 1, display: "flex", flexDirection: "column", gap: 6, minHeight: 60, overflowY: "auto", maxHeight: "calc(100vh - 280px)" }}>
                  {stageDeals.map((deal) => <DealPipelineCard key={deal.id} deal={deal} onMove={handleMove} />)}
                  {stageDeals.length === 0 && (
                    <div style={{ fontSize: 10, color: theme.textDim, textAlign: "center", padding: "20px 8px" }}>No properties</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : viewMode === "list" && !isMobile ? (
        /* List View */
        <div style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 8, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${theme.cardBorder}` }}>
                {["Property", "Address", "Stage", "Priority", "Purchase", "Expected Sale", "Est. Profit", "ROI", "Days", ""].map((h) => (
                  <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontSize: 9, color: theme.textDim, textTransform: "uppercase", letterSpacing: 0.6, fontWeight: 500, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredDeals.map((deal) => {
                const m = computeDealMetrics(deal);
                const stageInfo = DEAL_STAGES.find((s) => s.key === deal.stage);
                const priorityConf = PRIORITY_CONFIG[deal.priority] || PRIORITY_CONFIG.medium;
                return (
                  <tr key={deal.id} onClick={() => router.push(`/pipeline/${deal.id}`)} style={{ borderBottom: `1px solid ${theme.cardBorder}`, cursor: "pointer" }}>
                    <td style={{ padding: "8px 10px", fontSize: 12, fontWeight: 600, color: theme.text }}>{deal.name}</td>
                    <td style={{ padding: "8px 10px", fontSize: 11, color: theme.textDim, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{deal.address || "—"}</td>
                    <td style={{ padding: "8px 10px" }}>
                      <span style={{ fontSize: 9, fontWeight: 600, color: stageInfo?.color, background: `${stageInfo?.color}15`, padding: "2px 6px", borderRadius: 3, textTransform: "uppercase" }}>{stageInfo?.label}</span>
                    </td>
                    <td style={{ padding: "8px 10px" }}>
                      <span style={{ fontSize: 9, fontWeight: 600, color: priorityConf.color }}>{priorityConf.icon} {priorityConf.label}</span>
                    </td>
                    <td style={{ padding: "8px 10px", fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: theme.text }}>{fmt(m.purchasePrice)}</td>
                    <td style={{ padding: "8px 10px", fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: theme.text }}>{fmt(m.expectedPrice)}</td>
                    <td style={{ padding: "8px 10px", fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: m.estimatedProfit >= 0 ? theme.green : theme.red }}>{fmt(m.estimatedProfit)}</td>
                    <td style={{ padding: "8px 10px", fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: m.estimatedRoi >= 0.15 ? theme.green : m.estimatedRoi >= 0 ? theme.orange : theme.red }}>{pct(m.estimatedRoi)}</td>
                    <td style={{ padding: "8px 10px", fontSize: 11, color: theme.textDim }}>{m.daysInPipeline}d</td>
                    <td style={{ padding: "8px 10px" }}>
                      <button onClick={(e) => { e.stopPropagation(); router.push(`/pipeline/${deal.id}`); }} style={{
                        background: "transparent", border: `1px solid ${theme.cardBorder}`, borderRadius: 4,
                        padding: "3px 8px", fontSize: 10, color: theme.accent, cursor: "pointer",
                      }}>Open</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* Mobile stacked view */
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {stages.map((stage) => {
            const stageDeals = grouped[stage.key] || [];
            if (stageDeals.length === 0) return null;
            return (
              <div key={stage.key}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: stage.color }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: theme.text }}>{stage.label}</span>
                  <span style={{ fontSize: 11, color: theme.textDim }}>({stageDeals.length})</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {stageDeals.map((deal) => <DealPipelineCard key={deal.id} deal={deal} onMove={handleMove} />)}
                </div>
              </div>
            );
          })}
          {filteredDeals.length === 0 && (
            <div style={{ textAlign: "center", padding: 40, color: theme.textDim }}>
              <p style={{ marginBottom: 12, fontSize: 13 }}>{searchQuery ? "No properties match your search." : "No properties in your pipeline yet."}</p>
              {!searchQuery && <button onClick={handleNewDeal} style={{ background: theme.accent, color: "#fff", border: "none", borderRadius: 6, padding: "8px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Add Your First Property</button>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
