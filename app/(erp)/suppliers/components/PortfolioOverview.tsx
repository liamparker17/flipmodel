"use client";
import { theme, fmt } from "../../../components/theme";
import { StatBox } from "./StatBox";
import type { Deal } from "../../../types/deal";

interface EstimatedCategory {
  category: string;
  label: string;
  items: { key: string; label: string; searchTerm: string; qty: number; unit: string; unitPrice: number; totalCost: number }[];
}

export function PortfolioOverview({ shoppableDeals, materialsMap, portfolioStats, isMobile, selectedDealId, onSelectDeal, shoppableDealOptions, title }: {
  shoppableDeals: Deal[];
  materialsMap: Record<string, EstimatedCategory[]>;
  portfolioStats: { totalBudget: number; totalItems: number; categories: number; properties: number };
  isMobile: boolean;
  selectedDealId: string;
  onSelectDeal: (id: string) => void;
  shoppableDealOptions: Deal[];
  title?: string;
}) {
  return (
    <div style={{ padding: isMobile ? 16 : 28, maxWidth: 1100 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: theme.text, margin: "0 0 4px" }}>{title || "Suppliers"}</h1>
        <p style={{ fontSize: 13, color: theme.textDim, margin: 0 }}>Material shopping lists across your portfolio</p>
      </div>

      <div style={{ marginBottom: 20 }}>
        <select
          value={selectedDealId}
          onChange={(e) => onSelectDeal(e.target.value)}
          style={{ background: theme.input, border: `1px solid ${theme.inputBorder}`, borderRadius: 6, padding: "8px 12px", color: theme.text, fontSize: 14, minWidth: 260, outline: "none", minHeight: 40 }}
        >
          <option value="all">All Properties</option>
          {shoppableDealOptions.map((d) => <option key={d.id} value={d.id}>{d.name}{d.address ? ` — ${d.address}` : ""} ({d.stage})</option>)}
        </select>
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
        <StatBox label="Total Material Budget" value={fmt(portfolioStats.totalBudget)} />
        <StatBox label="Items Needed" value={String(portfolioStats.totalItems)} />
        <StatBox label="Categories" value={String(portfolioStats.categories)} />
        <StatBox label="Properties" value={String(portfolioStats.properties)} />
      </div>

      {shoppableDeals.length === 0 && (
        <div style={{ padding: 40, textAlign: "center", color: theme.textDim, fontSize: 14 }}>
          No active properties. Add a property and move it to &quot;Purchased&quot; or &quot;Renovating&quot; stage.
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(320px, 1fr))", gap: 14 }}>
        {shoppableDeals.map((deal) => {
          const mats = materialsMap[deal.id] || [];
          const itemCount = mats.reduce((s, c) => s + c.items.length, 0);
          const totalCost = mats.reduce((s, c) => s + c.items.reduce((ss, i) => ss + i.totalCost, 0), 0);
          const customs = (deal.shoppingList || []).filter((s) => s.isCustom);
          const customTotal = customs.reduce((s, c) => s + (c.unitPrice || 0) * (c.qty || 0), 0);
          const purchasedCount = (deal.shoppingList || []).filter((s) => s.purchased).length;
          const totalItemCount = itemCount + customs.length;

          return (
            <div key={deal.id} style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 8, padding: 16, cursor: "pointer" }}
              onClick={() => onSelectDeal(deal.id)}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: theme.text }}>{deal.name}</div>
                  {deal.address && <div style={{ fontSize: 11, color: theme.textDim, marginTop: 1 }}>{deal.address}</div>}
                  <div style={{ fontSize: 11, color: theme.textDim, marginTop: 2 }}>
                    <span style={{ display: "inline-block", padding: "1px 6px", borderRadius: 4, fontSize: 10, fontWeight: 600, background: deal.stage === "renovating" ? `${theme.orange}20` : `${theme.accent}15`, color: deal.stage === "renovating" ? theme.orange : theme.accent }}>{deal.stage}</span>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: theme.text, fontFamily: "'JetBrains Mono', monospace" }}>{fmt(totalCost)}</div>
                  {customTotal > 0 && <div style={{ fontSize: 11, color: theme.orange, fontWeight: 600 }}>+{fmt(customTotal)} unanticipated</div>}
                </div>
              </div>
              <div style={{ display: "flex", gap: 16, fontSize: 12, color: theme.textDim }}>
                <span>{totalItemCount} items</span>
                <span>{mats.length} categories</span>
                {customs.length > 0 && <span style={{ color: theme.orange }}>{customs.length} extra</span>}
                {purchasedCount > 0 && <span style={{ color: theme.green }}>{purchasedCount} purchased</span>}
              </div>
              {totalItemCount > 0 && (
                <div style={{ marginTop: 10, height: 4, background: theme.inputBorder, borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${(purchasedCount / totalItemCount) * 100}%`, background: theme.green, borderRadius: 2, transition: "width 0.3s" }} />
                </div>
              )}
              <div style={{ marginTop: 10, fontSize: 12, color: theme.accent, fontWeight: 600 }}>View List &rarr;</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
