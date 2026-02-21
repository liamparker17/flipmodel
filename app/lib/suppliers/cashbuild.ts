import type { SupplierConnector } from "./baseSupplier";
import type { MaterialItem, SupplierOffer } from "../../types/supplier";

function randomVariance(base: number, pct: number): number {
  const factor = 1 + (Math.random() * 2 - 1) * pct;
  return Math.round(base * factor * 100) / 100;
}

export const cashbuildConnector: SupplierConnector = {
  id: "cashbuild",
  name: "Cashbuild",

  async search(material: MaterialItem): Promise<SupplierOffer> {
    await new Promise((r) => setTimeout(r, 150 + Math.random() * 250));

    const basePrice = getBasePrice(material.category);
    const unitPrice = randomVariance(basePrice, 0.15);
    const deliveryDays = Math.ceil(Math.random() * 5) + 1;
    const encoded = material.name.replace(/ /g, "+");

    return {
      supplierId: "cashbuild",
      supplierName: "Cashbuild",
      materialId: material.id,
      productName: material.name,
      unitPrice,
      deliveryDays,
      stockAvailable: Math.random() > 0.15,
      totalPrice: Math.round(unitPrice * material.quantity * 100) / 100,
      deepLink: `https://www.cashbuild.co.za/search?order=product.position.desc&c=0&s=${encoded}`,
    };
  },
};

function getBasePrice(category: string): number {
  const prices: Record<string, number> = {
    tiles: 269,
    paint: 439,
    plumbing: 1699,
    electrical: 129,
    flooring: 219,
    adhesives: 99,
    hardware: 139,
    finishes: 109,
    doors_windows: 649,
    waterproofing: 419,
  };
  return prices[category] || 180;
}
