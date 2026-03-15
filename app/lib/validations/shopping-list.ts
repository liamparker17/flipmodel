import { z } from "zod";

export const createItemSchema = z.object({
  dealId: z.string().min(1),
  materialKey: z.string().min(1),
  category: z.string().min(1),
  isCustom: z.boolean().optional(),
  label: z.string().optional(),
  qty: z.number().optional(),
  unit: z.string().optional(),
  unitPrice: z.number().optional(),
});

export const updateItemSchema = z.object({
  id: z.string().min(1),
  purchased: z.boolean().optional(),
  actualPrice: z.number().nullable().optional(),
  actualQty: z.number().nullable().optional(),
  vendor: z.string().nullable().optional(),
  purchasedDate: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  stylePreferences: z.record(z.string(), z.string()).nullable().optional(),
});
