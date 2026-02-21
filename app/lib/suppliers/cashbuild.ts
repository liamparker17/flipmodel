import type { SupplierConnector } from "./baseSupplier";
import type { MaterialItem, SupplierOffer } from "../../types/supplier";

/**
 * Cashbuild — budget-oriented, contractor-focused.
 * Cheapest on basics: cement, adhesives, hardware, waterproofing.
 * Limited range on premium finishes and electrical.
 */

const CATEGORY_MULTIPLIERS: Record<string, number> = {
  tiles: 0.92,          // budget tiles, good value
  paint: 0.94,          // budget paint lines
  plumbing: 0.93,       // budget plumbing fixtures
  electrical: 1.02,     // limited range, at/above market
  flooring: 0.96,       // competitive on basic laminate
  adhesives: 0.88,      // very competitive on adhesives/cement
  hardware: 0.90,       // cheapest on basic hardware
  finishes: 1.06,       // limited range, above market
  doors_windows: 0.94,  // budget doors
  waterproofing: 0.89,  // very competitive
};

function smallVariance(base: number): number {
  const factor = 1 + (Math.random() * 0.06 - 0.03);
  return Math.round(base * factor * 100) / 100;
}

export const cashbuildConnector: SupplierConnector = {
  id: "cashbuild",
  name: "Cashbuild",

  async search(material: MaterialItem): Promise<SupplierOffer> {
    await new Promise((r) => setTimeout(r, 100 + Math.random() * 200));

    const multiplier = CATEGORY_MULTIPLIERS[material.category] ?? 1.0;
    const unitPrice = smallVariance(material.baseUnitPrice * multiplier);
    const encoded = material.name.replace(/ /g, "+");

    return {
      supplierId: "cashbuild",
      supplierName: "Cashbuild",
      materialId: material.id,
      productName: material.name,
      unitPrice,
      deliveryDays: Math.random() > 0.5 ? 4 : Math.random() > 0.3 ? 3 : 2, // slower delivery
      stockAvailable: Math.random() > 0.15, // more stock issues
      totalPrice: Math.round(unitPrice * material.quantity * 100) / 100,
      deepLink: `https://www.cashbuild.co.za/search?order=product.position.desc&c=0&s=${encoded}`,
    };
  },
};
