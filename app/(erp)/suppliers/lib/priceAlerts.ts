import { PRICE_DATABASE, type SupplierPriceEntry } from "../../../lib/suppliers/priceDatabase";

const SUPPLIER_LABELS: Record<string, string> = {
  leroymerlin: "Leroy Merlin",
  builders: "Builders",
  cashbuild: "Cashbuild",
};

const SUPPLIER_COLORS: Record<string, string> = {
  leroymerlin: "#78BE20",
  builders: "#F97316",
  cashbuild: "#2563EB",
};

export interface PriceAlert {
  cheapestSupplier: string;
  cheapestLabel: string;
  cheapestColor: string;
  cheapestPrice: number;
  nextCheapestPrice: number;
  savings: number;
  unit: string;
}

/**
 * Get the cheapest supplier for a given material, if one is >10% cheaper.
 */
export function getPriceAlert(category: string, itemKey: string, unit: string): PriceAlert | null {
  const dbKey = `${category}_${itemKey}`;
  const entry = PRICE_DATABASE[dbKey];
  if (!entry) return null;

  const suppliers = (Object.keys(entry) as (keyof SupplierPriceEntry)[])
    .map((key) => ({ key, ...entry[key] }))
    .sort((a, b) => a.price - b.price);

  if (suppliers.length < 2) return null;

  const cheapest = suppliers[0];
  const nextCheapest = suppliers[1];
  const diff = nextCheapest.price - cheapest.price;
  const pctDiff = diff / nextCheapest.price;

  // Only show badge when >10% cheaper
  if (pctDiff <= 0.10) return null;

  return {
    cheapestSupplier: cheapest.key,
    cheapestLabel: SUPPLIER_LABELS[cheapest.key] || cheapest.key,
    cheapestColor: SUPPLIER_COLORS[cheapest.key] || "#888",
    cheapestPrice: cheapest.price,
    nextCheapestPrice: nextCheapest.price,
    savings: diff,
    unit: unit === "sqm" ? "/sqm" : unit === "lm" ? "/lm" : "",
  };
}

export interface CategoryBudgetTip {
  category: string;
  categoryLabel: string;
  bestSupplier: string;
  bestSupplierLabel: string;
  bestSupplierColor: string;
  totalAtBest: number;
  totalAtWorst: number;
  savings: number;
}

/**
 * For a list of items in a category, calculate which single supplier is cheapest
 * for all items in that category and the potential savings.
 */
export function getCategoryBudgetTip(
  items: { key: string; category: string; categoryLabel: string; qty: number; unit: string }[]
): CategoryBudgetTip | null {
  if (items.length === 0) return null;

  const supplierTotals: Record<string, number> = { leroymerlin: 0, builders: 0, cashbuild: 0 };
  let hasAnyPrice = false;

  for (const item of items) {
    const dbKey = `${item.category}_${item.key}`;
    const entry = PRICE_DATABASE[dbKey];
    if (!entry) continue;
    hasAnyPrice = true;
    for (const sup of Object.keys(supplierTotals)) {
      const price = entry[sup as keyof SupplierPriceEntry]?.price || 0;
      supplierTotals[sup] += price * item.qty;
    }
  }

  if (!hasAnyPrice) return null;

  const sorted = Object.entries(supplierTotals)
    .filter(([, total]) => total > 0)
    .sort(([, a], [, b]) => a - b);

  if (sorted.length < 2) return null;

  const [bestKey, bestTotal] = sorted[0];
  const [, worstTotal] = sorted[sorted.length - 1];
  const savings = worstTotal - bestTotal;

  // Only show if savings > R500
  if (savings < 500) return null;

  return {
    category: items[0].category,
    categoryLabel: items[0].categoryLabel,
    bestSupplier: bestKey,
    bestSupplierLabel: SUPPLIER_LABELS[bestKey] || bestKey,
    bestSupplierColor: SUPPLIER_COLORS[bestKey] || "#888",
    totalAtBest: bestTotal,
    totalAtWorst: worstTotal,
    savings,
  };
}
