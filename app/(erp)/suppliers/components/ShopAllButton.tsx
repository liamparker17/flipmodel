"use client";
import { theme } from "../../../components/theme";
import { getSupplierUrl, trackOutboundClick } from "../../../utils/trackOutbound";
import { buildSearchTerm } from "../lib/buildSearchTerm";
import type { ShoppingListItem, StylePreferences } from "../../../types/deal";

const SUPPLIERS = [
  { key: "leroymerlin" as const, label: "Leroy Merlin", color: "#78BE20" },
  { key: "builders" as const, label: "Builders", color: "#F97316" },
  { key: "cashbuild" as const, label: "Cashbuild", color: "#2563EB" },
];

interface EstimatedItem {
  key: string;
  label: string;
  searchTerm: string;
  category: string;
}

export function ShopAllButtons({ items, shoppingList, isMobile }: {
  items: EstimatedItem[];
  shoppingList: ShoppingListItem[];
  isMobile: boolean;
}) {
  const unpurchasedItems = items.filter((item) => {
    const entry = shoppingList.find((s) => s.materialKey === item.key && s.category === item.category);
    return !entry?.purchased;
  });

  if (unpurchasedItems.length === 0) return null;

  const handleShopAll = (supplierKey: "leroymerlin" | "builders" | "cashbuild", supplierLabel: string) => {
    // Open up to 5 tabs staggered to avoid popup blockers
    const toOpen = unpurchasedItems.slice(0, 5);

    toOpen.forEach((item, idx) => {
      const entry = shoppingList.find((s) => s.materialKey === item.key && s.category === item.category);
      const prefs: StylePreferences = entry?.stylePreferences || {};
      const term = buildSearchTerm(item.searchTerm, prefs);

      setTimeout(() => {
        const url = getSupplierUrl(supplierKey, term);
        trackOutboundClick(supplierLabel, item.label, item.category);
        window.open(url, "_blank", "noopener,noreferrer");
      }, idx * 300);
    });
  };

  return (
    <div style={{
      display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16,
      padding: "10px 14px", background: theme.input, borderRadius: 8,
      border: `1px solid ${theme.inputBorder}`, alignItems: "center",
    }}>
      <span style={{ fontSize: 12, color: theme.textDim, fontWeight: 500, marginRight: 4 }}>
        Shop all {unpurchasedItems.length > 5 ? `(first 5 of ${unpurchasedItems.length})` : `(${unpurchasedItems.length})`} at:
      </span>
      {SUPPLIERS.map((s) => (
        <button key={s.key} onClick={() => handleShopAll(s.key, s.label)}
          style={{
            background: `${s.color}18`, color: s.color, border: `1px solid ${s.color}40`,
            borderRadius: 6, padding: "6px 16px", fontSize: 12, fontWeight: 600,
            cursor: "pointer", whiteSpace: "nowrap",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = `${s.color}30`; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = `${s.color}18`; }}>
          Shop All at {s.label}
        </button>
      ))}
    </div>
  );
}
