import { z } from "zod";

export const createInventoryItemSchema = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  category: z.string().optional(),
  unit: z.string().optional(),
  reorderPoint: z.number().min(0).optional(),
  reorderQuantity: z.number().min(0).optional(),
  costPrice: z.number().min(0).optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
});

export const updateInventoryItemSchema = z.object({
  sku: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  unit: z.string().optional(),
  reorderPoint: z.number().min(0).optional(),
  reorderQuantity: z.number().min(0).optional(),
  costPrice: z.number().min(0).optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
});

export const createInventoryTransactionSchema = z.object({
  inventoryItemId: z.string().min(1),
  type: z.enum(["purchase", "sale", "adjustment", "transfer", "usage", "return"]),
  quantity: z.number(),
  unitCost: z.number().min(0).optional(),
  reference: z.string().optional(),
  referenceType: z.string().optional(),
  referenceId: z.string().optional(),
  dealId: z.string().optional(),
  notes: z.string().optional(),
});
