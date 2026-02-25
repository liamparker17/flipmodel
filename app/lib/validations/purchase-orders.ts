import { z } from "zod";

const purchaseOrderLineSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().positive(),
  unitPrice: z.number().min(0),
  amount: z.number().min(0),
  inventoryItemId: z.string().optional(),
  accountCode: z.string().optional(),
});

export const createPurchaseOrderSchema = z.object({
  contactId: z.string().optional(),
  dealId: z.string().optional(),
  orderDate: z.string().optional(),
  expectedDate: z.string().optional(),
  subtotal: z.number().min(0),
  tax: z.number().min(0),
  total: z.number().min(0),
  shippingCost: z.number().min(0).optional(),
  currency: z.string().optional(),
  deliveryAddress: z.string().optional(),
  notes: z.string().optional(),
  lines: z.array(purchaseOrderLineSchema),
});

export const updatePurchaseOrderSchema = z.object({
  contactId: z.string().optional(),
  dealId: z.string().optional(),
  orderDate: z.string().optional(),
  expectedDate: z.string().optional(),
  subtotal: z.number().min(0).optional(),
  tax: z.number().min(0).optional(),
  total: z.number().min(0).optional(),
  shippingCost: z.number().min(0).optional(),
  currency: z.string().optional(),
  deliveryAddress: z.string().optional(),
  notes: z.string().optional(),
  lines: z.array(purchaseOrderLineSchema).optional(),
});

export const approvePurchaseOrderSchema = z.object({});
