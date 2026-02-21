import type { SupplierConnector } from "./baseSupplier";
import type { MaterialItem, SupplierOffer } from "../../types/supplier";

/**
 * Builders Warehouse — broad range, mid-market pricing.
 * Strong on hardware, plumbing, and electrical.
 * Slightly above on tiles and paint vs specialists.
 */

const CATEGORY_MULTIPLIERS: Record<string, number> = {
  tiles: 1.04,          // above average on tiles
  paint: 1.02,          // slightly above (less house-brand competition)
  plumbing: 0.98,       // competitive on plumbing
  electrical: 0.96,     // strong on electrical
  flooring: 1.03,       // slightly above
  adhesives: 1.00,      // at market
  hardware: 0.95,       // competitive on hardware
  finishes: 1.04,       // above average
  doors_windows: 0.98,  // competitive
  waterproofing: 1.02,  // slightly above
};

function smallVariance(base: number): number {
  const factor = 1 + (Math.random() * 0.06 - 0.03);
  return Math.round(base * factor * 100) / 100;
}

export const buildersWarehouseConnector: SupplierConnector = {
  id: "builders",
  name: "Builders Warehouse",

  async search(material: MaterialItem): Promise<SupplierOffer> {
    await new Promise((r) => setTimeout(r, 150 + Math.random() * 200));

    const multiplier = CATEGORY_MULTIPLIERS[material.category] ?? 1.0;
    const unitPrice = smallVariance(material.baseUnitPrice * multiplier);
    const encoded = encodeURIComponent(material.name);

    return {
      supplierId: "builders",
      supplierName: "Builders Warehouse",
      materialId: material.id,
      productName: material.name,
      unitPrice,
      deliveryDays: Math.random() > 0.6 ? 3 : Math.random() > 0.3 ? 2 : 1,
      stockAvailable: Math.random() > 0.06,
      totalPrice: Math.round(unitPrice * material.quantity * 100) / 100,
      deepLink: `https://www.builders.co.za/search?text=${encoded}`,
    };
  },
};
