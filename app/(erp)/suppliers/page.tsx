"use client";
import { useState, useEffect, useMemo, useCallback } from "react";
import { theme, fmt } from "../../components/theme";
import useDeals from "../../hooks/useDeals";
import { estimateMaterials } from "../../utils/materialEstimator";
import { getSupplierUrl, trackOutboundClick } from "../../utils/trackOutbound";
import { fetchSupplierOffers, getBestPerItem, getBestSingleSupplier } from "../../lib/suppliers/aggregateOffers";
import type { Deal, ShoppingListItem } from "../../types/deal";
import type { SupplierOffer, SortOption, MaterialItem as SupplierMaterialItem } from "../../types/supplier";

// ─── Supplier button configs ───
const SUPPLIERS = [
  { key: "leroymerlin", label: "Leroy Merlin", color: "#78BE20" },
  { key: "builders", label: "Builders", color: "#F97316" },
  { key: "cashbuild", label: "Cashbuild", color: "#2563EB" },
] as const;

type SupplierKey = (typeof SUPPLIERS)[number]["key"];

const SUPPLIER_COLORS: Record<string, string> = {
  leroymerlin: "#78BE20",
  builders: "#F97316",
  cashbuild: "#2563EB",
};

interface EstimatedItem {
  key: string;
  label: string;
  searchTerm: string;
  qty: number;
  unit: string;
  unitPrice: number;
  totalCost: number;
}

interface EstimatedCategory {
  category: string;
  label: string;
  items: EstimatedItem[];
}

type ViewTab = "shopping" | "compare";

function getShoppingEntry(deal: Deal, materialKey: string, category: string): ShoppingListItem | undefined {
  return deal.shoppingList?.find((s) => s.materialKey === materialKey && s.category === category);
}

export default function SuppliersPage() {
  const { deals, loaded, markItemPurchased, addCustomShoppingItem, removeCustomShoppingItem } = useDeals();
  const [selectedDealId, setSelectedDealId] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showPurchased, setShowPurchased] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [activeTab, setActiveTab] = useState<ViewTab>("shopping");

  // Compare state
  const [offers, setOffers] = useState<SupplierOffer[]>([]);
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareSort, setCompareSort] = useState<SortOption>("price_asc");
  const [compareMode, setCompareMode] = useState<"perItem" | "singleSupplier">("perItem");

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // All deals that could have materials
  const shoppableDeals = useMemo(
    () => deals.filter((d) => ["analysing", "offer_made", "purchased", "renovating"].includes(d.stage)),
    [deals],
  );

  const selectedDeal = useMemo(
    () => (selectedDealId !== "all" ? deals.find((d) => d.id === selectedDealId) : null),
    [selectedDealId, deals],
  );

  // Materials for selected or all
  const materialsMap = useMemo(() => {
    const map: Record<string, EstimatedCategory[]> = {};
    const target = selectedDealId === "all" ? shoppableDeals : shoppableDeals.filter((d) => d.id === selectedDealId);
    for (const deal of target) {
      map[deal.id] = estimateMaterials(deal.data.rooms, deal.data.prop, deal.data.mode);
    }
    return map;
  }, [selectedDealId, shoppableDeals]);

  // Aggregate stats for portfolio
  const portfolioStats = useMemo(() => {
    let totalBudget = 0;
    let totalItems = 0;
    const categorySet = new Set<string>();
    for (const dealId of Object.keys(materialsMap)) {
      for (const cat of materialsMap[dealId]) {
        categorySet.add(cat.category);
        for (const item of cat.items) {
          totalBudget += item.totalCost;
          totalItems += 1;
        }
      }
    }
    for (const deal of shoppableDeals) {
      const customs = (deal.shoppingList || []).filter((s) => s.isCustom);
      for (const c of customs) {
        totalBudget += (c.unitPrice || 0) * (c.qty || 0);
        totalItems += 1;
      }
    }
    return { totalBudget, totalItems, categories: categorySet.size, properties: Object.keys(materialsMap).length };
  }, [materialsMap, shoppableDeals]);

  // Flat estimated items for the selected deal
  const flatItems = useMemo(() => {
    if (!selectedDeal) return [];
    const cats = materialsMap[selectedDeal.id] || [];
    const items: (EstimatedItem & { category: string; categoryLabel: string })[] = [];
    for (const cat of cats) {
      for (const item of cat.items) {
        items.push({ ...item, category: cat.category, categoryLabel: cat.label });
      }
    }
    return items;
  }, [selectedDeal, materialsMap]);

  // Custom / unanticipated items for the selected deal
  const customItems = useMemo(() => {
    if (!selectedDeal) return [];
    return (selectedDeal.shoppingList || []).filter((s) => s.isCustom);
  }, [selectedDeal]);

  // Filter estimated items
  const filteredItems = useMemo(() => {
    let result = flatItems;
    if (categoryFilter !== "all" && categoryFilter !== "unanticipated") {
      result = result.filter((i) => i.category === categoryFilter);
    }
    if (categoryFilter === "unanticipated") result = [];
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      result = result.filter((i) => i.label.toLowerCase().includes(q) || i.searchTerm.toLowerCase().includes(q));
    }
    if (!showPurchased && selectedDeal) {
      result = result.filter((i) => {
        const entry = getShoppingEntry(selectedDeal, i.key, i.category);
        return !entry?.purchased;
      });
    }
    return result;
  }, [flatItems, categoryFilter, searchTerm, showPurchased, selectedDeal]);

  // Filter custom items
  const filteredCustomItems = useMemo(() => {
    let result = customItems;
    if (categoryFilter !== "all" && categoryFilter !== "unanticipated") result = [];
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      result = result.filter((i) => (i.label || "").toLowerCase().includes(q));
    }
    if (!showPurchased) result = result.filter((i) => !i.purchased);
    return result;
  }, [customItems, categoryFilter, searchTerm, showPurchased]);

  // Categories for filter dropdown
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    const labels: Record<string, string> = {};
    for (const item of flatItems) {
      set.add(item.category);
      labels[item.category] = item.categoryLabel;
    }
    const cats = Array.from(set).map((c) => ({ value: c, label: labels[c] }));
    if (customItems.length > 0) cats.push({ value: "unanticipated", label: "Unanticipated Items" });
    return cats;
  }, [flatItems, customItems]);

  // Stats with two-bucket logic
  const purchaseStats = useMemo(() => {
    if (!selectedDeal) return { purchased: 0, remaining: 0, estimatedTotal: 0, actualOnEstimated: 0, runOver: 0, unanticipatedTotal: 0, customCount: 0 };
    let purchased = 0;
    let estimatedTotal = 0;
    let actualOnEstimated = 0;
    for (const item of flatItems) {
      estimatedTotal += item.totalCost;
      const entry = getShoppingEntry(selectedDeal, item.key, item.category);
      if (entry?.purchased) { purchased++; actualOnEstimated += entry.actualPrice ?? item.totalCost; }
    }
    let unanticipatedTotal = 0;
    let customPurchased = 0;
    for (const ci of customItems) {
      const itemTotal = (ci.unitPrice || 0) * (ci.qty || 0);
      unanticipatedTotal += ci.purchased ? (ci.actualPrice ?? itemTotal) : itemTotal;
      if (ci.purchased) customPurchased++;
    }
    return {
      purchased: purchased + customPurchased,
      remaining: (flatItems.length - purchased) + (customItems.length - customPurchased),
      estimatedTotal, actualOnEstimated,
      runOver: actualOnEstimated - estimatedTotal,
      unanticipatedTotal, customCount: customItems.length,
    };
  }, [selectedDeal, flatItems, customItems]);

  // ─── Compare: convert flat items to supplier MaterialItem format ───
  const supplierMaterials: SupplierMaterialItem[] = useMemo(() => {
    return flatItems.map((item) => ({
      id: `${item.category}_${item.key}`,
      name: item.searchTerm,
      category: item.category,
      quantity: item.qty,
      unit: item.unit,
    }));
  }, [flatItems]);

  const handleSearchPrices = useCallback(async () => {
    if (supplierMaterials.length === 0) return;
    setCompareLoading(true);
    try {
      const results = await fetchSupplierOffers(supplierMaterials);
      setOffers(results);
    } finally {
      setCompareLoading(false);
    }
  }, [supplierMaterials]);

  // Compare calculations
  const materialIds = useMemo(() => supplierMaterials.map((m) => m.id), [supplierMaterials]);
  const bestPerItem = useMemo(() => offers.length > 0 ? getBestPerItem(offers, materialIds) : null, [offers, materialIds]);
  const bestSingle = useMemo(() => offers.length > 0 ? getBestSingleSupplier(offers) : null, [offers]);

  // Grouped and sorted offers for display
  const groupedOffers = useMemo(() => {
    const groups: Record<string, { material: SupplierMaterialItem; offers: SupplierOffer[] }> = {};
    for (const mat of supplierMaterials) {
      groups[mat.id] = { material: mat, offers: [] };
    }
    for (const offer of offers) {
      if (groups[offer.materialId]) {
        groups[offer.materialId].offers.push(offer);
      }
    }
    // Sort within each group
    for (const g of Object.values(groups)) {
      g.offers.sort((a, b) => {
        switch (compareSort) {
          case "price_asc": return a.totalPrice - b.totalPrice;
          case "price_desc": return b.totalPrice - a.totalPrice;
          case "delivery_asc": return a.deliveryDays - b.deliveryDays;
          case "delivery_desc": return b.deliveryDays - a.deliveryDays;
          default: return 0;
        }
      });
    }
    return Object.values(groups);
  }, [supplierMaterials, offers, compareSort]);

  // Reset compare state on deal change
  useEffect(() => { setOffers([]); setCompareLoading(false); }, [selectedDealId]);

  if (!loaded) return <div style={{ padding: 40, color: theme.textDim }}>Loading...</div>;

  // ─── Portfolio Overview ───
  if (selectedDealId === "all") {
    return (
      <div style={{ padding: isMobile ? 16 : 28, maxWidth: 1100 }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: theme.text, margin: "0 0 4px" }}>Suppliers</h1>
          <p style={{ fontSize: 13, color: theme.textDim, margin: 0 }}>Material shopping lists across your portfolio</p>
        </div>

        <div style={{ marginBottom: 20 }}>
          <select
            value={selectedDealId}
            onChange={(e) => { setSelectedDealId(e.target.value); setCategoryFilter("all"); setSearchTerm(""); setShowAddForm(false); setActiveTab("shopping"); }}
            style={{ background: theme.input, border: `1px solid ${theme.inputBorder}`, borderRadius: 6, padding: "8px 12px", color: theme.text, fontSize: 14, minWidth: 260, outline: "none", minHeight: 40 }}
          >
            <option value="all">All Properties</option>
            {shoppableDeals.map((d) => <option key={d.id} value={d.id}>{d.name} ({d.stage})</option>)}
          </select>
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
          {[
            { label: "Total Material Budget", value: fmt(portfolioStats.totalBudget) },
            { label: "Items Needed", value: String(portfolioStats.totalItems) },
            { label: "Categories", value: String(portfolioStats.categories) },
            { label: "Properties", value: String(portfolioStats.properties) },
          ].map((kpi) => (
            <div key={kpi.label} style={{ background: theme.input, borderRadius: 6, padding: "10px 14px", flex: 1, minWidth: 140, border: `1px solid ${theme.inputBorder}` }}>
              <div style={{ fontSize: 10, color: theme.textDim, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 4, fontWeight: 500 }}>{kpi.label}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: theme.text, fontFamily: "'JetBrains Mono', monospace" }}>{kpi.value}</div>
            </div>
          ))}
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
                onClick={() => { setSelectedDealId(deal.id); setCategoryFilter("all"); setSearchTerm(""); setShowAddForm(false); setActiveTab("shopping"); }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: theme.text }}>{deal.name}</div>
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

  // ─── Property Detail View ───
  if (!selectedDeal) return <div style={{ padding: 40, color: theme.textDim }}>Property not found.</div>;

  return (
    <div style={{ padding: isMobile ? 16 : 28, maxWidth: 1100 }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <button
          onClick={() => { setSelectedDealId("all"); setCategoryFilter("all"); setSearchTerm(""); setShowAddForm(false); setActiveTab("shopping"); }}
          style={{ background: "transparent", border: "none", color: theme.accent, fontSize: 12, cursor: "pointer", padding: 0, marginBottom: 8, display: "flex", alignItems: "center", gap: 4 }}
        >
          &larr; All Properties
        </button>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: theme.text, margin: "0 0 4px" }}>{selectedDeal.name}</h1>
        <p style={{ fontSize: 13, color: theme.textDim, margin: 0 }}>{selectedDeal.address || "Shopping list"}</p>
      </div>

      {/* Property Selector */}
      <div style={{ marginBottom: 16 }}>
        <select
          value={selectedDealId}
          onChange={(e) => { setSelectedDealId(e.target.value); setCategoryFilter("all"); setSearchTerm(""); setShowAddForm(false); setActiveTab("shopping"); }}
          style={{ background: theme.input, border: `1px solid ${theme.inputBorder}`, borderRadius: 6, padding: "8px 12px", color: theme.text, fontSize: 14, minWidth: 260, outline: "none", minHeight: 40 }}
        >
          <option value="all">All Properties</option>
          {shoppableDeals.map((d) => <option key={d.id} value={d.id}>{d.name} ({d.stage})</option>)}
        </select>
      </div>

      {/* ─── Tab Switcher ─── */}
      <div style={{ display: "flex", gap: 0, marginBottom: 20, borderBottom: `1px solid ${theme.cardBorder}` }}>
        {([["shopping", "Shopping List"], ["compare", "Compare Prices"]] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            style={{
              background: "transparent", border: "none", borderBottom: activeTab === key ? `2px solid ${theme.accent}` : "2px solid transparent",
              padding: "10px 20px", fontSize: 13, fontWeight: activeTab === key ? 600 : 400,
              color: activeTab === key ? theme.accent : theme.textDim,
              cursor: "pointer", transition: "all 0.15s",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ─── SHOPPING LIST TAB ─── */}
      {activeTab === "shopping" && (
        <>
          {/* Stats Row */}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
            <StatBox label="Estimated Budget" value={fmt(purchaseStats.estimatedTotal)} />
            <StatBox label="Remaining" value={`${purchaseStats.remaining} items`} />
            <StatBox label="Purchased" value={`${purchaseStats.purchased} items`} color={theme.green} />
            {purchaseStats.runOver !== 0 && (
              <StatBox label={purchaseStats.runOver > 0 ? "Run Over" : "Under Budget"} value={fmt(Math.abs(purchaseStats.runOver))} sub="on estimated items" color={purchaseStats.runOver > 0 ? theme.red : theme.green} />
            )}
            {purchaseStats.customCount > 0 && (
              <StatBox label="Unanticipated" value={fmt(purchaseStats.unanticipatedTotal)} sub={`${purchaseStats.customCount} extra item${purchaseStats.customCount !== 1 ? "s" : ""}`} color={theme.orange} />
            )}
          </div>

          {/* Filters Row */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20, alignItems: "center" }}>
            <input type="text" placeholder="Search items..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              style={{ background: theme.input, border: `1px solid ${theme.inputBorder}`, borderRadius: 6, padding: "8px 12px", color: theme.text, fontSize: 13, outline: "none", minWidth: 200, minHeight: 36 }} />
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
              style={{ background: theme.input, border: `1px solid ${theme.inputBorder}`, borderRadius: 6, padding: "8px 12px", color: theme.text, fontSize: 13, outline: "none", minHeight: 36 }}>
              <option value="all">All Categories</option>
              {availableCategories.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: theme.textDim, cursor: "pointer" }}>
              <input type="checkbox" checked={showPurchased} onChange={(e) => setShowPurchased(e.target.checked)} style={{ accentColor: theme.accent }} />
              Show purchased
            </label>
            <button onClick={() => setShowAddForm(!showAddForm)} style={{ background: theme.orange, color: "#fff", border: "none", borderRadius: 6, padding: "6px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", minHeight: 36, marginLeft: "auto" }}>
              + Add Item
            </button>
          </div>

          {showAddForm && (
            <AddCustomItemForm dealId={selectedDeal.id} onAdd={(item) => { addCustomShoppingItem(selectedDeal.id, item); setShowAddForm(false); }} onCancel={() => setShowAddForm(false)} />
          )}

          {filteredItems.length > 0 && (
            <>
              <SectionHeader label="Estimated Materials" count={filteredItems.length} />
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
                {filteredItems.map((item) => {
                  const entry = getShoppingEntry(selectedDeal, item.key, item.category);
                  return <ShoppingItemCard key={`${item.category}-${item.key}`} item={item} isPurchased={entry?.purchased || false} entry={entry} dealId={selectedDeal.id} onTogglePurchased={markItemPurchased} isMobile={isMobile} />;
                })}
              </div>
            </>
          )}

          {filteredCustomItems.length > 0 && (
            <>
              <SectionHeader label="Additional / Unanticipated Items" count={filteredCustomItems.length} color={theme.orange} />
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {filteredCustomItems.map((ci) => (
                  <CustomItemCard key={ci.materialKey} item={ci} dealId={selectedDeal.id} onTogglePurchased={markItemPurchased} onRemove={removeCustomShoppingItem} isMobile={isMobile} />
                ))}
              </div>
            </>
          )}

          {filteredItems.length === 0 && filteredCustomItems.length === 0 && (
            <div style={{ padding: 40, textAlign: "center", color: theme.textDim, fontSize: 14 }}>No items match your filters.</div>
          )}
        </>
      )}

      {/* ─── COMPARE PRICES TAB ─── */}
      {activeTab === "compare" && (
        <>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20, alignItems: "center" }}>
            <button
              onClick={handleSearchPrices}
              disabled={compareLoading || flatItems.length === 0}
              style={{
                background: theme.accent, color: "#fff", border: "none", borderRadius: 6,
                padding: "10px 24px", fontSize: 13, fontWeight: 600, cursor: compareLoading ? "wait" : "pointer",
                minHeight: 40, opacity: (compareLoading || flatItems.length === 0) ? 0.6 : 1,
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
              <div style={{ fontSize: 14, marginBottom: 4 }}>Click &quot;Search Best Prices&quot; to compare {flatItems.length} items across 3 suppliers</div>
              <div style={{ fontSize: 12 }}>Results are simulated — architecture supports future real API integration</div>
            </div>
          )}

          {!compareLoading && offers.length > 0 && (
            <>
              {/* Comparison Results */}
              <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 24 }}>
                {groupedOffers.map((group) => {
                  const bestPick = bestPerItem?.picks[group.material.id];
                  return (
                    <div key={group.material.id} style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 8, overflow: "hidden" }}>
                      {/* Material header */}
                      <div style={{ padding: "12px 14px", borderBottom: `1px solid ${theme.cardBorder}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <span style={{ fontSize: 14, fontWeight: 600, color: theme.text }}>{group.material.name}</span>
                          <span style={{ fontSize: 11, color: theme.textDim, marginLeft: 10 }}>{group.material.quantity} {group.material.unit}{group.material.quantity !== 1 ? "s" : ""}</span>
                        </div>
                        <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, background: `${theme.accent}15`, color: theme.accent, fontWeight: 600 }}>{group.material.category}</span>
                      </div>

                      {/* Offer rows */}
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
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <div style={{ width: 8, height: 8, borderRadius: "50%", background: supplierColor, flexShrink: 0 }} />
                              <span style={{ fontSize: 13, color: theme.text, fontWeight: 500 }}>{offer.supplierName}</span>
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

              {/* ─── Totals Section ─── */}
              <div style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 8, padding: 20 }}>
                <h3 style={{ fontSize: 11, fontWeight: 600, color: theme.textDim, textTransform: "uppercase", letterSpacing: 0.8, margin: "0 0 16px" }}>Price Summary</h3>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 14 }}>
                  <div style={{ background: theme.input, borderRadius: 6, padding: 14, border: `1px solid ${theme.inputBorder}` }}>
                    <div style={{ fontSize: 10, color: theme.textDim, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 6 }}>Your Estimate</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: theme.text, fontFamily: "'JetBrains Mono', monospace" }}>{fmt(purchaseStats.estimatedTotal)}</div>
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
                    {bestPerItem.total < purchaseStats.estimatedTotal && (
                      <span>Potential saving vs estimate: <strong style={{ color: theme.green }}>{fmt(purchaseStats.estimatedTotal - bestPerItem.total)}</strong></span>
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
      )}
    </div>
  );
}

// ─── Section Header ───
function SectionHeader({ label, count, color = theme.textDim }: { label: string; count: number; color?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "8px 0 12px" }}>
      <div style={{ height: 1, flex: 1, background: theme.cardBorder }} />
      <span style={{ fontSize: 11, color, textTransform: "uppercase", letterSpacing: 1, fontWeight: 600 }}>{label} ({count})</span>
      <div style={{ height: 1, flex: 1, background: theme.cardBorder }} />
    </div>
  );
}

// ─── Stat Box ───
function StatBox({ label, value, sub, color = theme.text }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div style={{ background: theme.input, borderRadius: 6, padding: "10px 14px", flex: 1, minWidth: 130, border: `1px solid ${theme.inputBorder}` }}>
      <div style={{ fontSize: 10, color: theme.textDim, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 4, fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color, fontFamily: "'JetBrains Mono', monospace" }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

// ─── Add Custom Item Form ───
function AddCustomItemForm({ dealId, onAdd, onCancel }: {
  dealId: string;
  onAdd: (item: { label: string; category: string; qty: number; unit: string; unitPrice: number; vendor?: string }) => void;
  onCancel: () => void;
}) {
  const [label, setLabel] = useState("");
  const [qty, setQty] = useState("1");
  const [unit, setUnit] = useState("unit");
  const [unitPrice, setUnitPrice] = useState("");
  const [vendor, setVendor] = useState("");
  const inputStyle = { background: theme.input, border: `1px solid ${theme.inputBorder}`, borderRadius: 4, padding: "6px 10px", color: theme.text, fontSize: 13, outline: "none" as const, minHeight: 34 };

  return (
    <div style={{ background: theme.card, border: `1px solid ${theme.orange}40`, borderRadius: 8, padding: 16, marginBottom: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: theme.orange, marginBottom: 12 }}>Add Unanticipated Item</div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
        <div style={{ flex: 2, minWidth: 180 }}>
          <label style={{ fontSize: 10, color: theme.textDim, textTransform: "uppercase", letterSpacing: 0.6, display: "block", marginBottom: 4 }}>Item Name</label>
          <input type="text" placeholder="e.g. Extra basin mixer" value={label} onChange={(e) => setLabel(e.target.value)} style={{ ...inputStyle, width: "100%" }} />
        </div>
        <div style={{ flex: 0, minWidth: 70 }}>
          <label style={{ fontSize: 10, color: theme.textDim, textTransform: "uppercase", letterSpacing: 0.6, display: "block", marginBottom: 4 }}>Qty</label>
          <input type="number" value={qty} onChange={(e) => setQty(e.target.value)} style={{ ...inputStyle, width: "100%" }} />
        </div>
        <div style={{ flex: 0, minWidth: 90 }}>
          <label style={{ fontSize: 10, color: theme.textDim, textTransform: "uppercase", letterSpacing: 0.6, display: "block", marginBottom: 4 }}>Unit</label>
          <select value={unit} onChange={(e) => setUnit(e.target.value)} style={{ ...inputStyle, width: "100%" }}>
            {["unit", "sqm", "bag", "bucket", "roll", "length", "pack", "set", "tube", "kit"].map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
        <div style={{ flex: 1, minWidth: 110 }}>
          <label style={{ fontSize: 10, color: theme.textDim, textTransform: "uppercase", letterSpacing: 0.6, display: "block", marginBottom: 4 }}>Unit Price (R)</label>
          <input type="number" placeholder="0" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} style={{ ...inputStyle, width: "100%", fontFamily: "'JetBrains Mono', monospace" }} />
        </div>
        <div style={{ flex: 1, minWidth: 120 }}>
          <label style={{ fontSize: 10, color: theme.textDim, textTransform: "uppercase", letterSpacing: 0.6, display: "block", marginBottom: 4 }}>Vendor (optional)</label>
          <input type="text" placeholder="e.g. Builders" value={vendor} onChange={(e) => setVendor(e.target.value)} style={{ ...inputStyle, width: "100%" }} />
        </div>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={() => { if (!label.trim() || !unitPrice) return; onAdd({ label: label.trim(), category: "unanticipated", qty: parseInt(qty) || 1, unit, unitPrice: parseFloat(unitPrice) || 0, vendor: vendor.trim() || undefined }); }}
          style={{ background: theme.orange, color: "#fff", border: "none", borderRadius: 6, padding: "8px 18px", fontSize: 12, fontWeight: 600, cursor: "pointer", opacity: (!label.trim() || !unitPrice) ? 0.5 : 1 }}>Add Item</button>
        <button onClick={onCancel} style={{ background: "transparent", color: theme.textDim, border: `1px solid ${theme.cardBorder}`, borderRadius: 6, padding: "8px 18px", fontSize: 12, cursor: "pointer" }}>Cancel</button>
      </div>
    </div>
  );
}

// ─── Shopping Item Card (estimated items) ───
function ShoppingItemCard({ item, isPurchased, entry, dealId, onTogglePurchased, isMobile }: {
  item: EstimatedItem & { category: string; categoryLabel: string };
  isPurchased: boolean;
  entry: ShoppingListItem | undefined;
  dealId: string;
  onTogglePurchased: (dealId: string, materialKey: string, category: string, purchased: boolean, actualPrice?: number, vendor?: string) => void;
  isMobile: boolean;
}) {
  const [actualPrice, setActualPrice] = useState<string>(entry?.actualPrice?.toString() || "");
  const [vendor, setVendor] = useState<string>(entry?.vendor || "");
  const savings = entry?.actualPrice != null ? item.totalCost - entry.actualPrice : null;

  const handleSupplierClick = (supplier: SupplierKey, supplierLabel: string) => {
    const url = getSupplierUrl(supplier, item.searchTerm);
    trackOutboundClick(supplierLabel, item.label, item.category);
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div style={{ background: theme.card, border: `1px solid ${isPurchased ? `${theme.green}30` : theme.cardBorder}`, borderRadius: 8, padding: 14, opacity: isPurchased ? 0.7 : 1, transition: "all 0.15s" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            {isPurchased && <span style={{ color: theme.green, fontSize: 16 }}>&#10003;</span>}
            <span style={{ fontSize: 14, fontWeight: 600, color: theme.text, textDecoration: isPurchased ? "line-through" : "none" }}>{item.label}</span>
            <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 4, fontWeight: 600, background: `${theme.accent}15`, color: theme.accent }}>{item.categoryLabel}</span>
          </div>
          <div style={{ fontSize: 12, color: theme.textDim, display: "flex", gap: 16, flexWrap: "wrap" }}>
            <span>Qty: <strong style={{ color: theme.text }}>{item.qty}</strong> {item.unit}{item.qty !== 1 ? "s" : ""}</span>
            <span>Unit: <strong style={{ color: theme.text }}>{fmt(item.unitPrice)}</strong></span>
            <span>Est: <strong style={{ color: theme.text }}>{fmt(item.totalCost)}</strong></span>
            {savings !== null && <span style={{ color: savings >= 0 ? theme.green : theme.red, fontWeight: 600 }}>{savings >= 0 ? `Saved ${fmt(savings)}` : `Run over ${fmt(Math.abs(savings))}`}</span>}
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

// ─── Custom / Unanticipated Item Card ───
function CustomItemCard({ item, dealId, onTogglePurchased, onRemove, isMobile }: {
  item: ShoppingListItem; dealId: string;
  onTogglePurchased: (dealId: string, materialKey: string, category: string, purchased: boolean, actualPrice?: number, vendor?: string) => void;
  onRemove: (dealId: string, materialKey: string) => void; isMobile: boolean;
}) {
  const [actualPrice, setActualPrice] = useState<string>(item.actualPrice?.toString() || "");
  const [vendor, setVendor] = useState<string>(item.vendor || "");
  const isPurchased = item.purchased;
  const itemTotal = (item.unitPrice || 0) * (item.qty || 0);
  const savings = item.actualPrice != null ? itemTotal - item.actualPrice : null;

  return (
    <div style={{ background: theme.card, border: `1px solid ${isPurchased ? `${theme.green}30` : `${theme.orange}30`}`, borderRadius: 8, padding: 14, opacity: isPurchased ? 0.7 : 1 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
        <div style={{ flex: 1, minWidth: 200 }}>
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
