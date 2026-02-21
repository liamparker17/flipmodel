import { PRICE_DATABASE, type SupplierPriceEntry } from "../../../lib/suppliers/priceDatabase";
import type { ShoppingListItem } from "../../../types/deal";

export interface PrintItem {
  label: string;
  qty: number;
  unit: string;
  estPrice: number;
  category: string;
}

export interface SupplierGroup {
  supplierKey: string;
  supplierLabel: string;
  items: PrintItem[];
  subtotal: number;
}

const SUPPLIER_LABELS: Record<string, string> = {
  leroymerlin: "Leroy Merlin",
  builders: "Builders",
  cashbuild: "Cashbuild",
  other: "Other / Unassigned",
};

/**
 * Group items by cheapest supplier for printing.
 * Items already purchased with a vendor use that vendor instead.
 */
export function groupBySupplier(
  estimatedItems: { key: string; label: string; qty: number; unit: string; unitPrice: number; totalCost: number; category: string }[],
  customItems: ShoppingListItem[],
  shoppingList: ShoppingListItem[]
): SupplierGroup[] {
  const groups: Record<string, PrintItem[]> = {};

  for (const item of estimatedItems) {
    // Check if already purchased with a vendor
    const entry = shoppingList.find((s) => s.materialKey === item.key && s.category === item.category);
    if (entry?.purchased && entry.vendor) {
      const vendorKey = normalizeVendor(entry.vendor);
      if (!groups[vendorKey]) groups[vendorKey] = [];
      groups[vendorKey].push({
        label: item.label,
        qty: item.qty,
        unit: item.unit,
        estPrice: entry.actualPrice ?? item.totalCost,
        category: item.category,
      });
      continue;
    }

    // Find cheapest supplier from price database
    const dbKey = `${item.category}_${item.key}`;
    const priceEntry = PRICE_DATABASE[dbKey];
    let cheapestKey = "other";

    if (priceEntry) {
      let minPrice = Infinity;
      for (const sup of ["leroymerlin", "builders", "cashbuild"] as const) {
        if (priceEntry[sup] && priceEntry[sup].price < minPrice) {
          minPrice = priceEntry[sup].price;
          cheapestKey = sup;
        }
      }
    }

    if (!groups[cheapestKey]) groups[cheapestKey] = [];
    groups[cheapestKey].push({
      label: item.label,
      qty: item.qty,
      unit: item.unit,
      estPrice: item.totalCost,
      category: item.category,
    });
  }

  // Add custom items
  for (const ci of customItems) {
    const vendorKey = ci.vendor ? normalizeVendor(ci.vendor) : "other";
    if (!groups[vendorKey]) groups[vendorKey] = [];
    groups[vendorKey].push({
      label: ci.label || ci.materialKey,
      qty: ci.qty || 1,
      unit: ci.unit || "unit",
      estPrice: ci.purchased ? (ci.actualPrice ?? (ci.unitPrice || 0) * (ci.qty || 1)) : (ci.unitPrice || 0) * (ci.qty || 1),
      category: ci.category,
    });
  }

  // Convert to array
  const result: SupplierGroup[] = [];
  for (const [key, items] of Object.entries(groups)) {
    result.push({
      supplierKey: key,
      supplierLabel: SUPPLIER_LABELS[key] || key,
      items,
      subtotal: items.reduce((s, i) => s + i.estPrice, 0),
    });
  }

  // Sort: known suppliers first, then "other"
  const order = ["cashbuild", "builders", "leroymerlin"];
  result.sort((a, b) => {
    const ai = order.indexOf(a.supplierKey);
    const bi = order.indexOf(b.supplierKey);
    if (ai === -1 && bi === -1) return 0;
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });

  return result;
}

function normalizeVendor(vendor: string): string {
  const v = vendor.toLowerCase().trim();
  if (v.includes("leroy") || v.includes("leroymerlin")) return "leroymerlin";
  if (v.includes("builder")) return "builders";
  if (v.includes("cashbuild")) return "cashbuild";
  return vendor;
}
