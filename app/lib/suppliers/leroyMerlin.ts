import type { SupplierConnector } from "./baseSupplier";
import type { MaterialItem, SupplierOffer } from "../../types/supplier";

/**
 * Leroy Merlin — mid-to-premium positioning in SA market.
 * Generally competitive on tiles, paint, and finishes.
 * Slightly above average on plumbing and electrical.
 */

// Per-category multiplier vs the material catalog base price.
// Values reflect Leroy Merlin's real-world positioning in SA.
const CATEGORY_MULTIPLIERS: Record<string, number> = {
  tiles: 0.97,          // competitive on tiles
  paint: 0.95,          // strong on paint (house brands)
  plumbing: 1.05,       // slightly above average
  electrical: 1.08,     // premium on electrical
  flooring: 1.00,       // at market
  adhesives: 0.98,      // competitive
  hardware: 1.03,       // slightly above
  finishes: 0.96,       // good on finishes
  doors_windows: 1.02,  // at market
  waterproofing: 1.00,  // at market
};

// Small per-item variance to simulate real price differences (max +/- 3%)
function smallVariance(base: number): number {
  const factor = 1 + (Math.random() * 0.06 - 0.03);
  return Math.round(base * factor * 100) / 100;
}

export const leroyMerlinConnector: SupplierConnector = {
  id: "leroymerlin",
  name: "Leroy Merlin",

  async search(material: MaterialItem): Promise<SupplierOffer> {
    // Simulate network latency
    await new Promise((r) => setTimeout(r, 150 + Math.random() * 200));

    const multiplier = CATEGORY_MULTIPLIERS[material.category] ?? 1.0;
    const unitPrice = smallVariance(material.baseUnitPrice * multiplier);
    const encoded = material.name.replace(/ /g, "+");

    return {
      supplierId: "leroymerlin",
      supplierName: "Leroy Merlin",
      materialId: material.id,
      productName: material.name,
      unitPrice,
      deliveryDays: Math.random() > 0.7 ? 3 : Math.random() > 0.4 ? 2 : 1, // mostly 1-2 day
      stockAvailable: Math.random() > 0.08,
      totalPrice: Math.round(unitPrice * material.quantity * 100) / 100,
      deepLink: `https://leroymerlin.co.za/search/?q=${encoded}`,
    };
  },
};
