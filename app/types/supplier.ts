export interface MaterialItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  baseUnitPrice: number; // realistic unit price from material catalog
}

export interface SupplierOffer {
  supplierId: string;
  supplierName: string;
  materialId: string;
  productName: string;
  unitPrice: number;
  deliveryDays: number;
  stockAvailable: boolean;
  totalPrice: number;
  deepLink: string;
}

export type SortOption =
  | "price_asc"
  | "price_desc"
  | "delivery_asc"
  | "delivery_desc";
