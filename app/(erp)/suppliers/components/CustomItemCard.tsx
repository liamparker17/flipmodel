"use client";
import { useState } from "react";
import { theme, fmt } from "../../../components/theme";
import type { ShoppingListItem } from "../../../types/deal";

export function CustomItemCard({ item, dealId, onTogglePurchased, onRemove, isMobile, selected, onSelect }: {
  item: ShoppingListItem; dealId: string;
  onTogglePurchased: (dealId: string, materialKey: string, category: string, purchased: boolean, actualPrice?: number, vendor?: string) => void;
  onRemove: (dealId: string, materialKey: string) => void; isMobile: boolean;
  selected?: boolean; onSelect?: (key: string) => void;
}) {
  const [actualPrice, setActualPrice] = useState<string>(item.actualPrice?.toString() || "");
  const [vendor, setVendor] = useState<string>(item.vendor || "");
  const isPurchased = item.purchased;
  const itemTotal = (item.unitPrice || 0) * (item.qty || 0);
  const savings = item.actualPrice != null ? itemTotal - item.actualPrice : null;

  return (
    <div style={{ background: theme.card, border: `1px solid ${isPurchased ? `${theme.green}30` : `${theme.orange}30`}`, borderRadius: 8, padding: 14, opacity: isPurchased ? 0.7 : 1 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
        <div style={{ flex: 1, minWidth: 200, display: "flex", alignItems: "flex-start", gap: 8 }}>
          {onSelect && (
            <input type="checkbox" checked={selected || false} onChange={() => onSelect(item.materialKey)}
              style={{ accentColor: theme.accent, width: 16, height: 16, marginTop: 3, flexShrink: 0 }} />
          )}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              {isPurchased && <span style={{ color: theme.green, fontSize: 16 }}>&#10003;</span>}
              <span style={{ fontSize: 14, fontWeight: 600, color: theme.text, textDecoration: isPurchased ? "line-through" : "none" }}>{item.label || item.materialKey}</span>
              <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 4, fontWeight: 600, background: `${theme.orange}20`, color: theme.orange }}>Unanticipated</span>
            </div>
            <div style={{ fontSize: 12, color: theme.textDim, display: "flex", gap: 16, flexWrap: "wrap" }}>
              <span>Qty: <strong style={{ color: theme.text }}>{item.qty || 1}</strong> {item.unit || "unit"}{(item.qty || 1) !== 1 ? "s" : ""}</span>
              <span>Unit: <strong style={{ color: theme.text }}>{fmt(item.unitPrice || 0)}</strong></span>
              <span>Total: <strong style={{ color: theme.text }}>{fmt(itemTotal)}</strong></span>
              {savings !== null && <span style={{ color: savings >= 0 ? theme.green : theme.red, fontWeight: 600 }}>{savings >= 0 ? `Under ${fmt(savings)}` : `Over ${fmt(Math.abs(savings))}`}</span>}
            </div>
          </div>
        </div>
        <button onClick={() => onRemove(dealId, item.materialKey)} title="Remove item"
          style={{ background: `${theme.red}15`, color: theme.red, border: `1px solid ${theme.red}30`, borderRadius: 6, padding: "4px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer", minHeight: 28 }}>Remove</button>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10, flexWrap: "wrap", paddingTop: 10, borderTop: `1px solid ${theme.cardBorder}` }}>
        <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 12, color: theme.textDim }}>
          <input type="checkbox" checked={isPurchased} onChange={() => { const price = actualPrice ? parseFloat(actualPrice) : undefined; onTogglePurchased(dealId, item.materialKey, item.category, !isPurchased, price, vendor || undefined); }} style={{ accentColor: theme.green, width: 16, height: 16 }} />
          Purchased
        </label>
        <input type="number" placeholder="Actual price" value={actualPrice} onChange={(e) => setActualPrice(e.target.value)}
          onBlur={() => { if (isPurchased && actualPrice) onTogglePurchased(dealId, item.materialKey, item.category, true, parseFloat(actualPrice), vendor || undefined); }}
          style={{ background: theme.input, border: `1px solid ${theme.inputBorder}`, borderRadius: 4, padding: "4px 8px", color: theme.text, fontSize: 12, width: 110, outline: "none", fontFamily: "'JetBrains Mono', monospace" }} />
        <input type="text" placeholder="Vendor" value={vendor} onChange={(e) => setVendor(e.target.value)}
          onBlur={() => { if (isPurchased && vendor) onTogglePurchased(dealId, item.materialKey, item.category, true, actualPrice ? parseFloat(actualPrice) : undefined, vendor); }}
          style={{ background: theme.input, border: `1px solid ${theme.inputBorder}`, borderRadius: 4, padding: "4px 8px", color: theme.text, fontSize: 12, width: 130, outline: "none" }} />
        {item.purchasedDate && <span style={{ fontSize: 10, color: theme.textDim }}>{item.purchasedDate}</span>}
      </div>
    </div>
  );
}
