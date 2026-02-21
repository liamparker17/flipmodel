import type { SupplierConnector } from "./baseSupplier";
import type { MaterialItem, SupplierOffer } from "../../types/supplier";

function randomVariance(base: number, pct: number): number {
  const factor = 1 + (Math.random() * 2 - 1) * pct;
  return Math.round(base * factor * 100) / 100;
}

export const leroyMerlinConnector: SupplierConnector = {
  id: "leroymerlin",
  name: "Leroy Merlin",

  async search(material: MaterialItem): Promise<SupplierOffer> {
    // Simulate network delay
    await new Promise((r) => setTimeout(r, 200 + Math.random() * 300));

    const basePrice = getBasePrice(material.category);
    const unitPrice = randomVariance(basePrice, 0.15);
    const deliveryDays = Math.ceil(Math.random() * 4) + 1;
    const encoded = material.name.replace(/ /g, "+");

    return {
      supplierId: "leroymerlin",
      supplierName: "Leroy Merlin",
      materialId: material.id,
      productName: material.name,
      unitPrice,
      deliveryDays,
      stockAvailable: Math.random() > 0.1,
      totalPrice: Math.round(unitPrice * material.quantity * 100) / 100,
      deepLink: `https://leroymerlin.co.za/search/?q=${encoded}`,
    };
  },
};

function getBasePrice(category: string): number {
  const prices: Record<string, number> = {
    tiles: 289,
    paint: 479,
    plumbing: 1799,
    electrical: 149,
    flooring: 239,
    adhesives: 119,
    hardware: 159,
    finishes: 129,
    doors_windows: 699,
    waterproofing: 449,
  };
  return prices[category] || 200;
}
