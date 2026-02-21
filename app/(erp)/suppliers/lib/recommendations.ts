import { PRICE_DATABASE, type SupplierPriceEntry } from "../../../lib/suppliers/priceDatabase";
import { fmt } from "../../../components/theme";

export interface Recommendation {
  id: string;
  text: string;
  type: "savings" | "tip" | "insight";
}

const SUPPLIER_LABELS: Record<string, string> = {
  leroymerlin: "Leroy Merlin",
  builders: "Builders",
  cashbuild: "Cashbuild",
};

/**
 * Generate smart recommendations based on the shopping list and price database.
 */
export function getRecommendations(
  items: { key: string; category: string; categoryLabel: string; qty: number; unit: string; unitPrice: number; totalCost: number }[],
  purchasedCount: number,
  totalItems: number
): Recommendation[] {
  const recs: Recommendation[] = [];
  if (items.length === 0) return recs;

  // 1. Overall cheapest supplier analysis
  const supplierTotals: Record<string, number> = { leroymerlin: 0, builders: 0, cashbuild: 0 };
  let matchedItems = 0;

  for (const item of items) {
    const dbKey = `${item.category}_${item.key}`;
    const entry = PRICE_DATABASE[dbKey];
    if (!entry) continue;
    matchedItems++;
    for (const sup of Object.keys(supplierTotals)) {
      const price = entry[sup as keyof SupplierPriceEntry]?.price || 0;
      supplierTotals[sup] += price * item.qty;
    }
  }

  if (matchedItems > 2) {
    const sorted = Object.entries(supplierTotals)
      .filter(([, t]) => t > 0)
      .sort(([, a], [, b]) => a - b);

    if (sorted.length >= 2) {
      const [bestKey, bestTotal] = sorted[0];
      const [worstKey, worstTotal] = sorted[sorted.length - 1];
      const savings = worstTotal - bestTotal;

      if (savings > 1000) {
        recs.push({
          id: "overall_savings",
          text: `You could save ${fmt(savings)} by buying everything at ${SUPPLIER_LABELS[bestKey]}`,
          type: "savings",
        });
      }
    }
  }

  // 2. Category-specific tips
  const categoryItems: Record<string, typeof items> = {};
  for (const item of items) {
    if (!categoryItems[item.category]) categoryItems[item.category] = [];
    categoryItems[item.category].push(item);
  }

  for (const [cat, catItems] of Object.entries(categoryItems)) {
    const catTotals: Record<string, number> = { leroymerlin: 0, builders: 0, cashbuild: 0 };
    let catMatched = 0;

    for (const item of catItems) {
      const dbKey = `${item.category}_${item.key}`;
      const entry = PRICE_DATABASE[dbKey];
      if (!entry) continue;
      catMatched++;
      for (const sup of Object.keys(catTotals)) {
        const price = entry[sup as keyof SupplierPriceEntry]?.price || 0;
        catTotals[sup] += price * item.qty;
      }
    }

    if (catMatched >= 2) {
      const sorted = Object.entries(catTotals).filter(([, t]) => t > 0).sort(([, a], [, b]) => a - b);
      if (sorted.length >= 2) {
        const [bestKey, bestTotal] = sorted[0];
        const [, worstTotal] = sorted[sorted.length - 1];
        const savings = worstTotal - bestTotal;
        if (savings > 500) {
          const label = catItems[0].categoryLabel;
          recs.push({
            id: `cat_${cat}`,
            text: `Budget tip: ${SUPPLIER_LABELS[bestKey]} is ${fmt(savings)} cheaper for all your ${label.toLowerCase()} needs`,
            type: "savings",
          });
        }
      }
    }
  }

  // 3. Flipper tips (static, contextual)
  const hasTiles = items.some((i) => i.category === "tiles");
  if (hasTiles) {
    recs.push({
      id: "tip_tiles",
      text: "Most flippers choose matt tiles — easier to maintain in rentals",
      type: "tip",
    });
  }

  // 4. Progress insight
  if (totalItems > 0 && purchasedCount > 0 && purchasedCount < totalItems) {
    const pct = Math.round((purchasedCount / totalItems) * 100);
    recs.push({
      id: "progress",
      text: `You've purchased ${pct}% of your materials — ${totalItems - purchasedCount} items remaining`,
      type: "insight",
    });
  }

  return recs;
}
