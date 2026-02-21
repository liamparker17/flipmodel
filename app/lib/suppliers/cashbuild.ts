import type { SupplierConnector } from "./baseSupplier";
import type { MaterialItem, SupplierOffer } from "../../types/supplier";
import { PRICE_DATABASE } from "./priceDatabase";

/**
 * Cashbuild — budget-oriented, contractor-focused.
 * Prices sourced from cashbuild.co.za (Feb 2026).
 */

export const cashbuildConnector: SupplierConnector = {
  id: "cashbuild",
  name: "Cashbuild",

  async search(material: MaterialItem): Promise<SupplierOffer> {
    await new Promise((r) => setTimeout(r, 80 + Math.random() * 120));

    const entry = PRICE_DATABASE[material.id]?.cashbuild;
    const unitPrice = entry?.price ?? material.baseUnitPrice;
    const productName = entry?.productName ?? material.name;
    const stockAvailable = entry?.inStock ?? true;
    const deliveryDays = entry?.deliveryDays ?? 3;
    const encoded = material.name.replace(/ /g, "+");

    return {
      supplierId: "cashbuild",
      supplierName: "Cashbuild",
      materialId: material.id,
      productName,
      unitPrice,
      deliveryDays,
      stockAvailable,
      totalPrice: Math.round(unitPrice * material.quantity * 100) / 100,
      deepLink: `https://www.cashbuild.co.za/search?order=product.position.desc&c=0&s=${encoded}`,
    };
  },
};
