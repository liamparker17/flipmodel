"use client";
import { useState } from "react";
import { theme, fmt } from "../../../components/theme";
import { getSupplierUrl, trackOutboundClick } from "../../../utils/trackOutbound";
import { buildSearchTerm } from "../lib/buildSearchTerm";
import { getPriceAlert } from "../lib/priceAlerts";
import { StylePicker } from "./StylePicker";
import type { ShoppingListItem, StylePreferences } from "../../../types/deal";

const SUPPLIERS = [
  { key: "leroymerlin" as const, label: "Leroy Merlin", color: "#78BE20" },
  { key: "builders" as const, label: "Builders", color: "#F97316" },
  { key: "cashbuild" as const, label: "Cashbuild", color: "#2563EB" },
];

type SupplierKey = "leroymerlin" | "builders" | "cashbuild";

interface EstimatedItem {
  key: string;
  label: string;
  searchTerm: string;
  qty: number;
  unit: string;
  unitPrice: number;
  totalCost: number;
  category: string;
  categoryLabel: string;
}

export function ShoppingItemCard({ item, isPurchased, entry, dealId, onTogglePurchased, onStyleChange, isMobile, selected, onSelect }: {
  item: EstimatedItem;
  isPurchased: boolean;
  entry: ShoppingListItem | undefined;
  dealId: string;
  onTogglePurchased: (dealId: string, materialKey: string, category: string, purchased: boolean, actualPrice?: number, vendor?: string) => void;
  onStyleChange?: (dealId: string, materialKey: string, category: string, prefs: StylePreferences) => void;
  isMobile: boolean;
  selected?: boolean;
  onSelect?: (key: string) => void;
}) {
  const [actualPrice, setActualPrice] = useState<string>(entry?.actualPrice?.toString() || "");
  const [vendor, setVendor] = useState<string>(entry?.vendor || "");
  const savings = entry?.actualPrice != null ? item.totalCost - entry.actualPrice : null;
  const stylePrefs: StylePreferences = entry?.stylePreferences || {};

  const priceAlert = !isPurchased ? getPriceAlert(item.category, item.key, item.unit) : null;

  const effectiveSearchTerm = buildSearchTerm(item.searchTerm, stylePrefs);

  const handleSupplierClick = (supplier: SupplierKey, supplierLabel: string) => {
    const url = getSupplierUrl(supplier, effectiveSearchTerm);
    trackOutboundClick(supplierLabel, item.label, item.category);
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div style={{ background: theme.card, border: `1px solid ${isPurchased ? `${theme.green}30` : theme.cardBorder}`, borderRadius: 8, padding: 14, opacity: isPurchased ? 0.7 : 1, transition: "all 0.15s" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
        <div style={{ flex: 1, minWidth: 200, display: "flex", alignItems: "flex-start", gap: 8 }}>
          {onSelect && (
            <input type="checkbox" checked={selected || false} onChange={() => onSelect(`${item.category}-${item.key}`)}
              style={{ accentColor: theme.accent, width: 16, height: 16, marginTop: 3, flexShrink: 0 }} />
          )}
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
              {isPurchased && <span style={{ color: theme.green, fontSize: 16 }}>&#10003;</span>}
              <span style={{ fontSize: 14, fontWeight: 600, color: theme.text, textDecoration: isPurchased ? "line-through" : "none" }}>{item.label}</span>
              <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 4, fontWeight: 600, background: `${theme.accent}15`, color: theme.accent }}>{item.categoryLabel}</span>
              {priceAlert && (
                <span style={{
                  fontSize: 10, padding: "2px 8px", borderRadius: 4, fontWeight: 600,
                  background: `${priceAlert.cheapestColor}15`, color: priceAlert.cheapestColor,
                  whiteSpace: "nowrap",
                }}>
                  Cheapest at {priceAlert.cheapestLabel} — {fmt(priceAlert.cheapestPrice)}{priceAlert.unit}
                </span>
              )}
            </div>
            <div style={{ fontSize: 12, color: theme.textDim, display: "flex", gap: 16, flexWrap: "wrap" }}>
              <span>Qty: <strong style={{ color: theme.text }}>{item.qty}</strong> {item.unit}{item.qty !== 1 ? "s" : ""}</span>
              <span>Unit: <strong style={{ color: theme.text }}>{fmt(item.unitPrice)}</strong></span>
              <span>Est: <strong style={{ color: theme.text }}>{fmt(item.totalCost)}</strong></span>
              {savings !== null && <span style={{ color: savings >= 0 ? theme.green : theme.red, fontWeight: 600 }}>{savings >= 0 ? `Saved ${fmt(savings)}` : `Run over ${fmt(Math.abs(savings))}`}</span>}
              {priceAlert && (
                <span style={{ fontSize: 11, color: theme.green, fontWeight: 500 }}>
                  Save {fmt(priceAlert.savings)} vs next
                </span>
              )}
            </div>

            {/* Style Picker */}
            {!isPurchased && onStyleChange && (
              <StylePicker
                category={item.category}
                itemKey={item.key}
                preferences={stylePrefs}
                onChange={(prefs) => onStyleChange(dealId, item.key, item.category, prefs)}
              />
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {SUPPLIERS.map((s) => (
            <button key={s.key} onClick={() => handleSupplierClick(s.key, s.label)}
              style={{ background: `${s.color}18`, color: s.color, border: `1px solid ${s.color}40`, borderRadius: 6, padding: "6px 12px", fontSize: 11, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", minHeight: 32 }}
              onMouseEnter={(e) => { e.currentTarget.style.background = `${s.color}30`; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = `${s.color}18`; }}>
              {s.label}
            </button>
          ))}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10, flexWrap: "wrap", paddingTop: 10, borderTop: `1px solid ${theme.cardBorder}` }}>
        <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 12, color: theme.textDim }}>
          <input type="checkbox" checked={isPurchased} onChange={() => { const price = actualPrice ? parseFloat(actualPrice) : undefined; onTogglePurchased(dealId, item.key, item.category, !isPurchased, price, vendor || undefined); }} style={{ accentColor: theme.green, width: 16, height: 16 }} />
          Purchased
        </label>
        <input type="number" placeholder="Actual price" value={actualPrice} onChange={(e) => setActualPrice(e.target.value)}
          onBlur={() => { if (isPurchased && actualPrice) onTogglePurchased(dealId, item.key, item.category, true, parseFloat(actualPrice), vendor || undefined); }}
          style={{ background: theme.input, border: `1px solid ${theme.inputBorder}`, borderRadius: 4, padding: "4px 8px", color: theme.text, fontSize: 12, width: 110, outline: "none", fontFamily: "'JetBrains Mono', monospace" }} />
        <input type="text" placeholder="Vendor" value={vendor} onChange={(e) => setVendor(e.target.value)}
          onBlur={() => { if (isPurchased && vendor) onTogglePurchased(dealId, item.key, item.category, true, actualPrice ? parseFloat(actualPrice) : undefined, vendor); }}
          style={{ background: theme.input, border: `1px solid ${theme.inputBorder}`, borderRadius: 4, padding: "4px 8px", color: theme.text, fontSize: 12, width: 130, outline: "none" }} />
        {entry?.purchasedDate && <span style={{ fontSize: 10, color: theme.textDim }}>{entry.purchasedDate}</span>}
      </div>
    </div>
  );
}
