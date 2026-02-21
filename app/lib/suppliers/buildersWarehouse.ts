import type { SupplierConnector } from "./baseSupplier";
import type { MaterialItem, SupplierOffer } from "../../types/supplier";
import { PRICE_DATABASE } from "./priceDatabase";

/**
 * Builders Warehouse — broad range, mid-market pricing.
 * Prices sourced from builders.co.za (Feb 2026).
 */

export const buildersWarehouseConnector: SupplierConnector = {
  id: "builders",
  name: "Builders Warehouse",

  async search(material: MaterialItem): Promise<SupplierOffer> {
    await new Promise((r) => setTimeout(r, 80 + Math.random() * 120));

    const entry = PRICE_DATABASE[material.id]?.builders;
    const unitPrice = entry?.price ?? material.baseUnitPrice;
    const productName = entry?.productName ?? material.name;
    const stockAvailable = entry?.inStock ?? true;
    const deliveryDays = entry?.deliveryDays ?? 2;
    const encoded = encodeURIComponent(material.name);

    return {
      supplierId: "builders",
      supplierName: "Builders Warehouse",
      materialId: material.id,
      productName,
      unitPrice,
      deliveryDays,
      stockAvailable,
      totalPrice: Math.round(unitPrice * material.quantity * 100) / 100,
      deepLink: `https://www.builders.co.za/search?text=${encoded}`,
    };
  },
};
