import type { MaterialItem, SupplierOffer } from "../../types/supplier";

export interface SupplierConnector {
  id: string;
  name: string;
  search(material: MaterialItem): Promise<SupplierOffer>;
}
