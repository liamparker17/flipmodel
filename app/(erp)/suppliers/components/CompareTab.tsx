"use client";
import { theme, fmt } from "../../../components/theme";
import { trackOutboundClick } from "../../../utils/trackOutbound";
import type { SupplierOffer, SortOption, MaterialItem as SupplierMaterialItem } from "../../../types/supplier";

const SUPPLIER_COLORS: Record<string, string> = {
  leroymerlin: "#78BE20",
  builders: "#F97316",
  cashbuild: "#2563EB",
};

interface GroupedOffer {
  material: SupplierMaterialItem;
  offers: SupplierOffer[];
}

export function CompareTab({ flatItemsCount, compareLoading, offers, groupedOffers, bestPerItem, bestSingle, purchaseEstimatedTotal, compareSort, setCompareSort, compareMode, setCompareMode, onSearchPrices, isMobile }: {
  flatItemsCount: number;
  compareLoading: boolean;
  offers: SupplierOffer[];
  groupedOffers: GroupedOffer[];
  bestPerItem: { total: number; picks: Record<string, { supplierId: string }> } | null;
  bestSingle: { total: number; supplierId: string; supplierName: string } | null;
  purchaseEstimatedTotal: number;
  compareSort: SortOption;
  setCompareSort: (s: SortOption) => void;
  compareMode: "perItem" | "singleSupplier";
  setCompareMode: (m: "perItem" | "singleSupplier") => void;
  onSearchPrices: () => void;
  isMobile: boolean;
}) {
  return (
    <>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20, alignItems: "center" }}>
        <button
          onClick={onSearchPrices}
          disabled={compareLoading || flatItemsCount === 0}
          style={{
            background: theme.accent, color: "#fff", border: "none", borderRadius: 6,
            padding: "10px 24px", fontSize: 13, fontWeight: 600, cursor: compareLoading ? "wait" : "pointer",
            minHeight: 40, opacity: (compareLoading || flatItemsCount === 0) ? 0.6 : 1,
          }}
        >
          {compareLoading ? "Searching..." : "Search Best Prices"}
        </button>
        <select value={compareSort} onChange={(e) => setCompareSort(e.target.value as SortOption)}
          style={{ background: theme.input, border: `1px solid ${theme.inputBorder}`, borderRadius: 6, padding: "8px 12px", color: theme.text, fontSize: 13, outline: "none", minHeight: 40 }}>
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
          <option value="delivery_asc">Delivery: Fastest</option>
          <option value="delivery_desc">Delivery: Slowest</option>
        </select>
        <div style={{ display: "flex", gap: 4, background: theme.input, borderRadius: 6, border: `1px solid ${theme.inputBorder}`, overflow: "hidden" }}>
          {([["perItem", "Best Per Item"], ["singleSupplier", "Best Single Supplier"]] as const).map(([key, label]) => (
            <button key={key} onClick={() => setCompareMode(key)}
              style={{
                background: compareMode === key ? theme.accent : "transparent", color: compareMode === key ? "#fff" : theme.textDim,
                border: "none", padding: "8px 14px", fontSize: 11, fontWeight: 600, cursor: "pointer", minHeight: 36,
              }}>{label}</button>
          ))}
        </div>
      </div>

      {compareLoading && (
        <div style={{ padding: 60, textAlign: "center" }}>
          <div style={{ fontSize: 14, color: theme.textDim, marginBottom: 8 }}>Querying suppliers...</div>
          <div style={{ width: 200, height: 4, background: theme.inputBorder, borderRadius: 2, margin: "0 auto", overflow: "hidden" }}>
            <div style={{ width: "60%", height: "100%", background: theme.accent, borderRadius: 2, animation: "pulse 1s ease-in-out infinite alternate" }} />
          </div>
        </div>
      )}

      {!compareLoading && offers.length === 0 && (
        <div style={{ padding: 60, textAlign: "center", color: theme.textDim }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>&#128269;</div>
          <div style={{ fontSize: 14, marginBottom: 4 }}>Click &quot;Search Best Prices&quot; to compare {flatItemsCount} items across 3 suppliers</div>
          <div style={{ fontSize: 12 }}>Prices sourced from supplier websites — click &quot;View&quot; to verify on the supplier&apos;s site</div>
        </div>
      )}

      {!compareLoading && offers.length > 0 && (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 24 }}>
            {groupedOffers.map((group) => {
              const bestPick = bestPerItem?.picks[group.material.id];
              return (
                <div key={group.material.id} style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 8, overflow: "hidden" }}>
                  <div style={{ padding: "12px 14px", borderBottom: `1px solid ${theme.cardBorder}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <span style={{ fontSize: 14, fontWeight: 600, color: theme.text }}>{group.material.name}</span>
                      <span style={{ fontSize: 11, color: theme.textDim, marginLeft: 10 }}>{group.material.quantity} {group.material.unit}{group.material.quantity !== 1 ? "s" : ""}</span>
                    </div>
                    <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, background: `${theme.accent}15`, color: theme.accent, fontWeight: 600 }}>{group.material.category}</span>
                  </div>

                  <div style={{ fontSize: 10, color: theme.textDim, display: "grid", gridTemplateColumns: "1fr 100px 80px 110px 100px", gap: 0, padding: "8px 14px 4px", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
                    <span>Supplier</span>
                    <span style={{ textAlign: "right" }}>Unit Price</span>
                    <span style={{ textAlign: "right" }}>Delivery</span>
                    <span style={{ textAlign: "right" }}>Total</span>
                    <span style={{ textAlign: "right" }}>Action</span>
                  </div>
                  {group.offers.map((offer) => {
                    const isBest = compareMode === "perItem" && bestPick?.supplierId === offer.supplierId;
                    const supplierColor = SUPPLIER_COLORS[offer.supplierId] || theme.accent;
                    return (
                      <div key={offer.supplierId} style={{
                        display: "grid", gridTemplateColumns: "1fr 100px 80px 110px 100px", gap: 0,
                        padding: "8px 14px", alignItems: "center",
                        background: isBest ? `${theme.green}08` : "transparent",
                        borderLeft: isBest ? `3px solid ${theme.green}` : "3px solid transparent",
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                          <div style={{ width: 8, height: 8, borderRadius: "50%", background: supplierColor, flexShrink: 0 }} />
                          <div style={{ minWidth: 0 }}>
                            <span style={{ fontSize: 13, color: theme.text, fontWeight: 500, display: "block" }}>{offer.supplierName}</span>
                            <span style={{ fontSize: 10, color: theme.textDim, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{offer.productName}</span>
                          </div>
                          {!offer.stockAvailable && <span style={{ fontSize: 9, color: theme.red, fontWeight: 600, background: `${theme.red}15`, padding: "1px 5px", borderRadius: 3 }}>Low Stock</span>}
                          {isBest && <span style={{ fontSize: 9, color: theme.green, fontWeight: 600, background: `${theme.green}15`, padding: "1px 5px", borderRadius: 3 }}>Best</span>}
                        </div>
                        <span style={{ textAlign: "right", fontSize: 13, fontFamily: "'JetBrains Mono', monospace", color: theme.text }}>{fmt(offer.unitPrice)}</span>
                        <span style={{ textAlign: "right", fontSize: 12, color: offer.deliveryDays <= 2 ? theme.green : theme.textDim }}>{offer.deliveryDays} day{offer.deliveryDays !== 1 ? "s" : ""}</span>
                        <span style={{ textAlign: "right", fontSize: 13, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: isBest ? theme.green : theme.text }}>{fmt(offer.totalPrice)}</span>
                        <div style={{ textAlign: "right" }}>
                          <button
                            onClick={() => {
                              trackOutboundClick(offer.supplierName, offer.productName, group.material.category);
                              window.open(offer.deepLink, "_blank", "noopener,noreferrer");
                            }}
                            style={{
                              background: `${supplierColor}18`, color: supplierColor, border: `1px solid ${supplierColor}40`,
                              borderRadius: 4, padding: "4px 10px", fontSize: 10, fontWeight: 600, cursor: "pointer",
                            }}
                          >
                            View &rarr;
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* Totals Section */}
          <div style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 8, padding: 20 }}>
            <h3 style={{ fontSize: 11, fontWeight: 600, color: theme.textDim, textTransform: "uppercase", letterSpacing: 0.8, margin: "0 0 16px" }}>Price Summary</h3>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 14 }}>
              <div style={{ background: theme.input, borderRadius: 6, padding: 14, border: `1px solid ${theme.inputBorder}` }}>
                <div style={{ fontSize: 10, color: theme.textDim, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 6 }}>Your Estimate</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: theme.text, fontFamily: "'JetBrains Mono', monospace" }}>{fmt(purchaseEstimatedTotal)}</div>
              </div>
              <div style={{ background: `${theme.green}08`, borderRadius: 6, padding: 14, border: `1px solid ${theme.green}25` }}>
                <div style={{ fontSize: 10, color: theme.green, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 6 }}>Best Per Item Total</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: theme.green, fontFamily: "'JetBrains Mono', monospace" }}>{bestPerItem ? fmt(bestPerItem.total) : "—"}</div>
                <div style={{ fontSize: 10, color: theme.textDim, marginTop: 4 }}>Cherry-pick cheapest from each supplier</div>
              </div>
              <div style={{ background: theme.input, borderRadius: 6, padding: 14, border: `1px solid ${theme.inputBorder}` }}>
                <div style={{ fontSize: 10, color: theme.textDim, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 6 }}>Best Single Supplier</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: theme.accent, fontFamily: "'JetBrains Mono', monospace" }}>{bestSingle ? fmt(bestSingle.total) : "—"}</div>
                {bestSingle && (
                  <div style={{ fontSize: 10, color: theme.accent, marginTop: 4, fontWeight: 600 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: SUPPLIER_COLORS[bestSingle.supplierId] || theme.accent, display: "inline-block", marginRight: 4 }} />
                    {bestSingle.supplierName}
                  </div>
                )}
              </div>
            </div>
            {bestPerItem && bestSingle && (
              <div style={{ marginTop: 14, fontSize: 12, color: theme.textDim, display: "flex", gap: 20, flexWrap: "wrap" }}>
                {bestPerItem.total < purchaseEstimatedTotal && (
                  <span>Potential saving vs estimate: <strong style={{ color: theme.green }}>{fmt(purchaseEstimatedTotal - bestPerItem.total)}</strong></span>
                )}
                {bestSingle.total < bestPerItem.total && (
                  <span>Single-supplier convenience premium: <strong style={{ color: theme.orange }}>{fmt(bestSingle.total - bestPerItem.total)}</strong></span>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}
