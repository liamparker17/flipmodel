"use client";
import { useState, useEffect, useMemo, useCallback } from "react";
import { theme, fmt, styles } from "../../components/theme";
import useOrgContext from "../../hooks/useOrgContext";
import useDeals from "../../hooks/api/useApiDeals";
import useIsMobile from "../../hooks/useIsMobile";
import { estimateMaterials } from "../../utils/materialEstimator";
import { getSupplierUrl, trackOutboundClick } from "../../utils/trackOutbound";
import { fetchSupplierOffers, getBestPerItem, getBestSingleSupplier } from "../../lib/suppliers/aggregateOffers";
import { getCategoryBudgetTip } from "./lib/priceAlerts";
import { getRecommendations } from "./lib/recommendations";
import { buildSearchTerm } from "./lib/buildSearchTerm";
import type { Deal, ShoppingListItem, StylePreferences } from "../../types/deal";
import type { SupplierOffer, SortOption, MaterialItem as SupplierMaterialItem } from "../../types/supplier";

// Components
import { PortfolioOverview } from "./components/PortfolioOverview";
import { ShoppingItemCard } from "./components/ShoppingItemCard";
import { CustomItemCard } from "./components/CustomItemCard";
import { AddCustomItemForm } from "./components/AddCustomItemForm";
import { CompareTab } from "./components/CompareTab";
import { SpendDashboard } from "./components/SpendDashboard";
import { StatBox } from "./components/StatBox";
import { SectionHeader } from "./components/SectionHeader";
import { ShopAllButtons } from "./components/ShopAllButton";
import { BulkActionBar } from "./components/BulkActionBar";
import { RecommendationBanner } from "./components/RecommendationBanner";
import { PrintableShoppingList } from "./components/PrintableShoppingList";

interface EstimatedItem {
  key: string; label: string; searchTerm: string; qty: number; unit: string; unitPrice: number; totalCost: number;
}
interface EstimatedCategory {
  category: string; label: string; items: EstimatedItem[];
}

type ViewTab = "shopping" | "compare" | "spend";

function getShoppingEntry(deal: Deal, materialKey: string, category: string): ShoppingListItem | undefined {
  return deal.shoppingList?.find((s) => s.materialKey === materialKey && s.category === category);
}

export default function SuppliersPage() {
  const { deals, loaded, markItemPurchased, addCustomShoppingItem, removeCustomShoppingItem, updateShoppingItem } = useDeals();
  const { role, hasPermission } = useOrgContext();
  const canWrite = hasPermission("expenses:write");
  const [selectedDealId, setSelectedDealId] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showPurchased, setShowPurchased] = useState(true);
  const isMobile = useIsMobile();
  const [showAddForm, setShowAddForm] = useState(false);
  const [activeTab, setActiveTab] = useState<ViewTab>(role === "finance_manager" ? "spend" : "shopping");
  const [showPrintPreview, setShowPrintPreview] = useState(false);

  // Bulk selection state
  const [selectMode, setSelectMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  // Compare state
  const [offers, setOffers] = useState<SupplierOffer[]>([]);
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareSort, setCompareSort] = useState<SortOption>("price_asc");
  const [compareMode, setCompareMode] = useState<"perItem" | "singleSupplier">("perItem");

  const resetView = useCallback((dealId?: string) => {
    if (dealId !== undefined) setSelectedDealId(dealId);
    setCategoryFilter("all"); setSearchTerm(""); setShowAddForm(false); setActiveTab("shopping");
    setSelectMode(false); setSelectedItems(new Set());
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
      const rooms = Array.isArray(deal.data?.rooms) ? deal.data.rooms : [];
      map[deal.id] = estimateMaterials(rooms as unknown as Record<string, unknown>[], (deal.data?.prop || {}) as unknown as Record<string, unknown>, deal.data?.mode || "quick");
    }
    return map;
  }, [selectedDealId, shoppableDeals]);

  // Aggregate stats for portfolio
  const portfolioStats = useMemo(() => {
    let totalBudget = 0, totalItems = 0;
    const categorySet = new Set<string>();
    for (const dealId of Object.keys(materialsMap)) {
      for (const cat of materialsMap[dealId]) {
        categorySet.add(cat.category);
        for (const item of cat.items) { totalBudget += item.totalCost; totalItems += 1; }
      }
    }
    for (const deal of shoppableDeals) {
      const customs = (deal.shoppingList || []).filter((s) => s.isCustom);
      for (const c of customs) { totalBudget += (c.unitPrice || 0) * (c.qty || 0); totalItems += 1; }
    }
    return { totalBudget, totalItems, categories: categorySet.size, properties: Object.keys(materialsMap).length };
  }, [materialsMap, shoppableDeals]);

  // Flat estimated items for the selected deal
  const flatItems = useMemo(() => {
    if (!selectedDeal) return [];
    const cats = materialsMap[selectedDeal.id] || [];
    const items: (EstimatedItem & { category: string; categoryLabel: string })[] = [];
    for (const cat of cats) {
      for (const item of cat.items) items.push({ ...item, category: cat.category, categoryLabel: cat.label });
    }
    return items;
  }, [selectedDeal, materialsMap]);

  const customItems = useMemo(() => {
    if (!selectedDeal) return [];
    return (selectedDeal.shoppingList || []).filter((s) => s.isCustom);
  }, [selectedDeal]);

  // Filtered items
  const filteredItems = useMemo(() => {
    let result = flatItems;
    if (categoryFilter !== "all" && categoryFilter !== "unanticipated") result = result.filter((i) => i.category === categoryFilter);
    if (categoryFilter === "unanticipated") result = [];
    if (searchTerm) { const q = searchTerm.toLowerCase(); result = result.filter((i) => i.label.toLowerCase().includes(q) || i.searchTerm.toLowerCase().includes(q)); }
    if (!showPurchased && selectedDeal) result = result.filter((i) => { const entry = getShoppingEntry(selectedDeal, i.key, i.category); return !entry?.purchased; });
    return result;
  }, [flatItems, categoryFilter, searchTerm, showPurchased, selectedDeal]);

  const filteredCustomItems = useMemo(() => {
    let result = customItems;
    if (categoryFilter !== "all" && categoryFilter !== "unanticipated") result = [];
    if (searchTerm) { const q = searchTerm.toLowerCase(); result = result.filter((i) => (i.label || "").toLowerCase().includes(q)); }
    if (!showPurchased) result = result.filter((i) => !i.purchased);
    return result;
  }, [customItems, categoryFilter, searchTerm, showPurchased]);

  const availableCategories = useMemo(() => {
    const set = new Set<string>(); const labels: Record<string, string> = {};
    for (const item of flatItems) { set.add(item.category); labels[item.category] = item.categoryLabel; }
    const cats = Array.from(set).map((c) => ({ value: c, label: labels[c] }));
    if (customItems.length > 0) cats.push({ value: "unanticipated", label: "Unanticipated Items" });
    return cats;
  }, [flatItems, customItems]);

  // Purchase stats
  const purchaseStats = useMemo(() => {
    if (!selectedDeal) return { purchased: 0, remaining: 0, estimatedTotal: 0, actualOnEstimated: 0, runOver: 0, unanticipatedTotal: 0, customCount: 0 };
    let purchased = 0, estimatedTotal = 0, actualOnEstimated = 0;
    for (const item of flatItems) {
      estimatedTotal += item.totalCost;
      const entry = getShoppingEntry(selectedDeal, item.key, item.category);
      if (entry?.purchased) { purchased++; actualOnEstimated += entry.actualPrice ?? item.totalCost; }
    }
    let unanticipatedTotal = 0, customPurchased = 0;
    for (const ci of customItems) {
      const itemTotal = (ci.unitPrice || 0) * (ci.qty || 0);
      unanticipatedTotal += ci.purchased ? (ci.actualPrice ?? itemTotal) : itemTotal;
      if (ci.purchased) customPurchased++;
    }
    return { purchased: purchased + customPurchased, remaining: (flatItems.length - purchased) + (customItems.length - customPurchased), estimatedTotal, actualOnEstimated, runOver: actualOnEstimated - estimatedTotal, unanticipatedTotal, customCount: customItems.length };
  }, [selectedDeal, flatItems, customItems]);

  // Compare logic
  const supplierMaterials: SupplierMaterialItem[] = useMemo(() => flatItems.map((item) => ({ id: `${item.category}_${item.key}`, name: item.searchTerm, category: item.category, quantity: item.qty, unit: item.unit, baseUnitPrice: item.unitPrice })), [flatItems]);

  const handleSearchPrices = useCallback(async () => {
    if (supplierMaterials.length === 0) return;
    setCompareLoading(true);
    try { const results = await fetchSupplierOffers(supplierMaterials); setOffers(results); } finally { setCompareLoading(false); }
  }, [supplierMaterials]);

  const materialIds = useMemo(() => supplierMaterials.map((m) => m.id), [supplierMaterials]);
  const bestPerItem = useMemo(() => offers.length > 0 ? getBestPerItem(offers, materialIds) : null, [offers, materialIds]);
  const bestSingle = useMemo(() => offers.length > 0 ? getBestSingleSupplier(offers) : null, [offers]);

  const groupedOffers = useMemo(() => {
    const groups: Record<string, { material: SupplierMaterialItem; offers: SupplierOffer[] }> = {};
    for (const mat of supplierMaterials) groups[mat.id] = { material: mat, offers: [] };
    for (const offer of offers) { if (groups[offer.materialId]) groups[offer.materialId].offers.push(offer); }
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

  useEffect(() => { setOffers([]); setCompareLoading(false); }, [selectedDealId]);

  // Category budget tips
  const categoryTips = useMemo(() => {
    const categories: Record<string, typeof flatItems> = {};
    for (const item of flatItems) {
      if (!categories[item.category]) categories[item.category] = [];
      categories[item.category].push(item);
    }
    return Object.values(categories).map((items) => getCategoryBudgetTip(items)).filter(Boolean);
  }, [flatItems]);

  // Smart recommendations
  const recommendations = useMemo(
    () => getRecommendations(flatItems, purchaseStats.purchased, flatItems.length + customItems.length),
    [flatItems, purchaseStats.purchased, customItems.length]
  );

  // Style preference handler
  const handleStyleChange = useCallback((dealId: string, materialKey: string, category: string, prefs: StylePreferences) => {
    updateShoppingItem(dealId, materialKey, category, { stylePreferences: prefs });
  }, [updateShoppingItem]);

  // Bulk action handlers
  const toggleSelect = useCallback((key: string) => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }, []);

  const handleBulkPurchased = useCallback(() => {
    if (!selectedDeal) return;
    for (const key of selectedItems) {
      const [cat, ...rest] = key.split("-");
      const itemKey = rest.join("-");
      // Check if it's a custom item
      const customItem = customItems.find((ci) => ci.materialKey === key);
      if (customItem) {
        markItemPurchased(selectedDeal.id, customItem.materialKey, customItem.category, true);
      } else {
        // Estimated item — find the matching category-key pair
        const item = flatItems.find((fi) => `${fi.category}-${fi.key}` === key);
        if (item) markItemPurchased(selectedDeal.id, item.key, item.category, true);
      }
    }
    setSelectedItems(new Set());
    setSelectMode(false);
  }, [selectedDeal, selectedItems, flatItems, customItems, markItemPurchased]);

  const handleBulkOpenAtSupplier = useCallback((supplierKey: "leroymerlin" | "builders" | "cashbuild") => {
    if (!selectedDeal) return;
    const toOpen = Array.from(selectedItems).slice(0, 5);
    toOpen.forEach((key, idx) => {
      const item = flatItems.find((fi) => `${fi.category}-${fi.key}` === key);
      if (!item) return;
      const entry = getShoppingEntry(selectedDeal, item.key, item.category);
      const term = buildSearchTerm(item.searchTerm, entry?.stylePreferences);
      setTimeout(() => {
        const url = getSupplierUrl(supplierKey, term);
        trackOutboundClick(supplierKey, item.label, item.category);
        window.open(url, "_blank", "noopener,noreferrer");
      }, idx * 300);
    });
  }, [selectedDeal, selectedItems, flatItems]);

  const bulkSearchTerms = useMemo(() => {
    return Array.from(selectedItems).map((key) => {
      const item = flatItems.find((fi) => `${fi.category}-${fi.key}` === key);
      return item?.searchTerm || "";
    }).filter(Boolean);
  }, [selectedItems, flatItems]);

  if (!loaded) return <div style={{ padding: 40, color: theme.textDim }}>Loading...</div>;

  // ─── Portfolio Overview ───
  if (selectedDealId === "all") {
    return (
      <PortfolioOverview
        shoppableDeals={shoppableDeals} materialsMap={materialsMap} portfolioStats={portfolioStats}
        isMobile={isMobile} selectedDealId={selectedDealId} onSelectDeal={(id) => resetView(id)}
        shoppableDealOptions={shoppableDeals}
        title={role === "finance_manager" ? "Vendor Spend" : role === "project_manager" ? "Materials & Orders" : "Suppliers & Materials"}
      />
    );
  }

  if (!selectedDeal) return <div style={{ padding: 40, color: theme.textDim }}>Property not found.</div>;

  return (
    <div style={{ padding: isMobile ? 16 : 28, maxWidth: 1100 }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <button onClick={() => resetView("all")}
          style={{ background: "transparent", border: "none", color: theme.accent, fontSize: 12, cursor: "pointer", padding: 0, marginBottom: 8, display: "flex", alignItems: "center", gap: 4 }}>
          &larr; All Properties
        </button>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: theme.text, margin: "0 0 4px" }}>{selectedDeal.name}</h1>
        <p style={{ fontSize: 13, color: theme.textDim, margin: 0 }}>{selectedDeal.address || "Shopping list"}</p>
      </div>

      {/* Property Selector */}
      <div style={{ marginBottom: 16 }}>
        <select value={selectedDealId} onChange={(e) => resetView(e.target.value)}
          style={{ background: theme.input, border: `1px solid ${theme.inputBorder}`, borderRadius: 6, padding: "8px 12px", color: theme.text, fontSize: 14, minWidth: 260, outline: "none", minHeight: 40 }}>
          <option value="all">All Properties</option>
          {shoppableDeals.map((d) => <option key={d.id} value={d.id}>{d.name}{d.address ? ` — ${d.address}` : ""} ({d.stage})</option>)}
        </select>
      </div>

      {/* Tab Switcher — now with Spend Tracker */}
      <div style={{ display: "flex", gap: 0, marginBottom: 20, borderBottom: `1px solid ${theme.cardBorder}` }}>
        {([["shopping", "Shopping List"], ["compare", "Compare Prices"], ["spend", "Spend Tracker"]] as const)
          .filter(([key]) => {
            if (key === "compare" && (role === "viewer" || role === "site_supervisor")) return false;
            if (key === "spend" && role === "site_supervisor") return false;
            return true;
          })
          .map(([key, label]) => (
          <button key={key} onClick={() => setActiveTab(key)}
            style={{
              background: "transparent", border: "none",
              borderBottom: activeTab === key ? `2px solid ${theme.accent}` : "2px solid transparent",
              padding: "10px 20px", fontSize: 13, fontWeight: activeTab === key ? 600 : 400,
              color: activeTab === key ? theme.accent : theme.textDim,
              cursor: "pointer", transition: "all 0.15s",
            }}>
            {label}
          </button>
        ))}
      </div>

      {/* ─── SHOPPING LIST TAB ─── */}
      {activeTab === "shopping" && (
        <>
          {/* Recommendations Banner */}
          <RecommendationBanner recommendations={recommendations} />

          {/* Stats Row — hidden for site_supervisor (simplified view) */}
          {role !== "site_supervisor" && (
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
          )}

          {/* Shop All Buttons */}
          <ShopAllButtons items={flatItems} shoppingList={selectedDeal.shoppingList || []} isMobile={isMobile} />

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
            <button onClick={() => setSelectMode(!selectMode)}
              style={{ background: selectMode ? theme.accent : "transparent", color: selectMode ? "#fff" : theme.textDim, border: `1px solid ${selectMode ? theme.accent : theme.cardBorder}`, borderRadius: 6, padding: "6px 14px", fontSize: 12, fontWeight: 500, cursor: "pointer", minHeight: 36 }}>
              {selectMode ? "Exit Select" : "Select"}
            </button>
            <button onClick={() => setShowPrintPreview(true)}
              style={{ background: "transparent", color: theme.textDim, border: `1px solid ${theme.cardBorder}`, borderRadius: 6, padding: "6px 14px", fontSize: 12, fontWeight: 500, cursor: "pointer", minHeight: 36 }}>
              Print List
            </button>
            {canWrite && (
              <button onClick={() => setShowAddForm(!showAddForm)} style={{ background: theme.orange, color: "#fff", border: "none", borderRadius: 6, padding: "6px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", minHeight: 36, marginLeft: "auto" }}>
                + Add Item
              </button>
            )}
          </div>

          {showAddForm && (
            <AddCustomItemForm dealId={selectedDeal.id} onAdd={(item) => { addCustomShoppingItem(selectedDeal.id, item); setShowAddForm(false); }} onCancel={() => setShowAddForm(false)} />
          )}

          {/* Category Budget Tips — hidden for site_supervisor */}
          {role !== "site_supervisor" && categoryTips.map((tip) => tip && (
            <div key={tip.category} style={{
              background: `${tip.bestSupplierColor}08`, border: `1px solid ${tip.bestSupplierColor}20`,
              borderRadius: 8, padding: "8px 14px", marginBottom: 12,
              display: "flex", alignItems: "center", gap: 8, fontSize: 12,
            }}>
              <span style={{ color: tip.bestSupplierColor, fontWeight: 600 }}>Budget tip:</span>
              <span style={{ color: theme.text }}>Buy all {tip.categoryLabel.toLowerCase()} at {tip.bestSupplierLabel} — save {fmt(tip.savings)} vs most expensive</span>
            </div>
          ))}

          {filteredItems.length > 0 && (
            <>
              <SectionHeader label="Estimated Materials" count={filteredItems.length} />
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
                {filteredItems.map((item) => {
                  const entry = getShoppingEntry(selectedDeal, item.key, item.category);
                  const itemKey = `${item.category}-${item.key}`;
                  return (
                    <ShoppingItemCard
                      key={itemKey} item={item} isPurchased={entry?.purchased || false}
                      entry={entry} dealId={selectedDeal.id}
                      onTogglePurchased={markItemPurchased}
                      onStyleChange={handleStyleChange}
                      isMobile={isMobile}
                      selected={selectMode ? selectedItems.has(itemKey) : undefined}
                      onSelect={selectMode ? toggleSelect : undefined}
                    />
                  );
                })}
              </div>
            </>
          )}

          {filteredCustomItems.length > 0 && (
            <>
              <SectionHeader label="Additional / Unanticipated Items" count={filteredCustomItems.length} color={theme.orange} />
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {filteredCustomItems.map((ci) => (
                  <CustomItemCard key={ci.materialKey} item={ci} dealId={selectedDeal.id}
                    onTogglePurchased={markItemPurchased} onRemove={removeCustomShoppingItem} isMobile={isMobile}
                    selected={selectMode ? selectedItems.has(ci.materialKey) : undefined}
                    onSelect={selectMode ? toggleSelect : undefined}
                  />
                ))}
              </div>
            </>
          )}

          {filteredItems.length === 0 && filteredCustomItems.length === 0 && (
            <div style={{ padding: 40, textAlign: "center", color: theme.textDim, fontSize: 14 }}>No items match your filters.</div>
          )}

          {/* Bulk Action Bar */}
          {selectMode && canWrite && (
            <BulkActionBar
              selectedCount={selectedItems.size}
              onMarkPurchased={handleBulkPurchased}
              onOpenAtSupplier={handleBulkOpenAtSupplier}
              onClear={() => setSelectedItems(new Set())}
              searchTerms={bulkSearchTerms}
            />
          )}

          {/* Print Preview Modal */}
          {showPrintPreview && (
            <PrintableShoppingList
              propertyName={selectedDeal.name + (selectedDeal.address ? ` — ${selectedDeal.address}` : "")}
              estimatedItems={flatItems}
              customItems={customItems}
              shoppingList={selectedDeal.shoppingList || []}
              onClose={() => setShowPrintPreview(false)}
            />
          )}
        </>
      )}

      {/* ─── COMPARE PRICES TAB ─── */}
      {activeTab === "compare" && (
        <CompareTab
          flatItemsCount={flatItems.length} compareLoading={compareLoading} offers={offers}
          groupedOffers={groupedOffers} bestPerItem={bestPerItem} bestSingle={bestSingle}
          purchaseEstimatedTotal={purchaseStats.estimatedTotal}
          compareSort={compareSort} setCompareSort={setCompareSort}
          compareMode={compareMode} setCompareMode={setCompareMode}
          onSearchPrices={handleSearchPrices} isMobile={isMobile}
        />
      )}

      {/* ─── SPEND TRACKER TAB ─── */}
      {activeTab === "spend" && (
        <SpendDashboard deal={selectedDeal} flatItems={flatItems} customItems={customItems} />
      )}
    </div>
  );
}
