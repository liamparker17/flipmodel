import type { MaterialItem, SupplierOffer } from "../../types/supplier";
import type { SupplierConnector } from "./baseSupplier";
import { leroyMerlinConnector } from "./leroyMerlin";
import { buildersWarehouseConnector } from "./buildersWarehouse";
import { cashbuildConnector } from "./cashbuild";

const connectors: SupplierConnector[] = [
  leroyMerlinConnector,
  buildersWarehouseConnector,
  cashbuildConnector,
];

/**
 * Fetch offers from all supplier connectors for a list of materials.
 * Queries all suppliers in parallel for each material.
 */
export async function fetchSupplierOffers(
  materials: MaterialItem[]
): Promise<SupplierOffer[]> {
  const allPromises: Promise<SupplierOffer>[] = [];

  for (const material of materials) {
    for (const connector of connectors) {
      allPromises.push(connector.search(material));
    }
  }

  const results = await Promise.all(allPromises);
  return results;
}

/**
 * Find the cheapest offer per material item.
 */
export function getBestPerItem(
  offers: SupplierOffer[],
  materialIds: string[]
): { total: number; picks: Record<string, SupplierOffer> } {
  const picks: Record<string, SupplierOffer> = {};
  let total = 0;

  for (const id of materialIds) {
    const itemOffers = offers.filter((o) => o.materialId === id);
    if (itemOffers.length === 0) continue;
    const best = itemOffers.reduce((a, b) => (a.totalPrice < b.totalPrice ? a : b));
    picks[id] = best;
    total += best.totalPrice;
  }

  return { total: Math.round(total * 100) / 100, picks };
}

/**
 * Find the cheapest single supplier (buy everything from one place).
 */
export function getBestSingleSupplier(
  offers: SupplierOffer[]
): { supplierId: string; supplierName: string; total: number } | null {
  const supplierTotals: Record<string, { name: string; total: number }> = {};

  for (const offer of offers) {
    if (!supplierTotals[offer.supplierId]) {
      supplierTotals[offer.supplierId] = { name: offer.supplierName, total: 0 };
    }
    supplierTotals[offer.supplierId].total += offer.totalPrice;
  }

  let best: { supplierId: string; supplierName: string; total: number } | null = null;

  for (const [id, data] of Object.entries(supplierTotals)) {
    const rounded = Math.round(data.total * 100) / 100;
    if (!best || rounded < best.total) {
      best = { supplierId: id, supplierName: data.name, total: rounded };
    }
  }

  return best;
}
