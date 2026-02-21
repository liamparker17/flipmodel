import type { SupplierConnector } from "./baseSupplier";
import type { MaterialItem, SupplierOffer } from "../../types/supplier";
import { PRICE_DATABASE } from "./priceDatabase";

/**
 * Leroy Merlin — mid-to-premium positioning in SA market.
 * Prices sourced from leroymerlin.co.za (Feb 2026).
 */

export const leroyMerlinConnector: SupplierConnector = {
  id: "leroymerlin",
  name: "Leroy Merlin",

  async search(material: MaterialItem): Promise<SupplierOffer> {
    // Simulate network latency
    await new Promise((r) => setTimeout(r, 80 + Math.random() * 120));

    const entry = PRICE_DATABASE[material.id]?.leroymerlin;
    const unitPrice = entry?.price ?? material.baseUnitPrice;
    const productName = entry?.productName ?? material.name;
    const stockAvailable = entry?.inStock ?? true;
    const deliveryDays = entry?.deliveryDays ?? 2;
    const encoded = material.name.replace(/ /g, "+");

    return {
      supplierId: "leroymerlin",
      supplierName: "Leroy Merlin",
      materialId: material.id,
      productName,
      unitPrice,
      deliveryDays,
      stockAvailable,
      totalPrice: Math.round(unitPrice * material.quantity * 100) / 100,
      deepLink: `https://leroymerlin.co.za/search/?q=${encoded}`,
    };
  },
};
