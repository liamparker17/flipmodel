import type { SupplierConnector } from "./baseSupplier";
import type { MaterialItem, SupplierOffer } from "../../types/supplier";

function randomVariance(base: number, pct: number): number {
  const factor = 1 + (Math.random() * 2 - 1) * pct;
  return Math.round(base * factor * 100) / 100;
}

export const buildersWarehouseConnector: SupplierConnector = {
  id: "builders",
  name: "Builders Warehouse",

  async search(material: MaterialItem): Promise<SupplierOffer> {
    await new Promise((r) => setTimeout(r, 200 + Math.random() * 300));

    const basePrice = getBasePrice(material.category);
    const unitPrice = randomVariance(basePrice, 0.15);
    const deliveryDays = Math.ceil(Math.random() * 3) + 1;
    const encoded = encodeURIComponent(material.name);

    return {
      supplierId: "builders",
      supplierName: "Builders Warehouse",
      materialId: material.id,
      productName: material.name,
      unitPrice,
      deliveryDays,
      stockAvailable: Math.random() > 0.08,
      totalPrice: Math.round(unitPrice * material.quantity * 100) / 100,
      deepLink: `https://www.builders.co.za/search?text=${encoded}`,
    };
  },
};

function getBasePrice(category: string): number {
  const prices: Record<string, number> = {
    tiles: 309,
    paint: 499,
    plumbing: 1899,
    electrical: 139,
    flooring: 259,
    adhesives: 109,
    hardware: 169,
    finishes: 139,
    doors_windows: 749,
    waterproofing: 479,
  };
  return prices[category] || 210;
}
