import { z } from "zod";

export const createToolSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  brand: z.string().optional(),
  model: z.string().optional(),
  serialNumber: z.string().optional(),
  purchaseDate: z.string().optional(),
  purchaseCost: z.number().min(0).optional(),
  expectedLifespanMonths: z.number().int().min(1).optional(),
  replacementCost: z.number().min(0).optional(),
  status: z.string().optional(),
  condition: z.string().optional(),
  notes: z.string().optional(),
});

export const updateToolSchema = z.object({
  name: z.string().min(1).optional(),
  category: z.string().optional(),
  brand: z.string().nullable().optional(),
  model: z.string().nullable().optional(),
  serialNumber: z.string().nullable().optional(),
  purchaseDate: z.string().nullable().optional(),
  purchaseCost: z.number().min(0).optional(),
  expectedLifespanMonths: z.number().int().min(1).optional(),
  replacementCost: z.number().min(0).optional(),
  status: z.string().optional(),
  condition: z.string().optional(),
  currentHolderType: z.string().nullable().optional(),
  currentHolderId: z.string().nullable().optional(),
  currentHolderName: z.string().nullable().optional(),
  currentDealId: z.string().nullable().optional(),
  currentDealName: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export const checkoutToolSchema = z.object({
  contractorName: z.string().min(1),
  contractorId: z.string().optional(),
  dealId: z.string().optional(),
  dealName: z.string().optional(),
  propertyAddress: z.string().optional(),
  expectedReturnDate: z.string().optional(),
  notes: z.string().optional(),
});

export const returnToolSchema = z.object({
  checkoutId: z.string().min(1),
  conditionIn: z.string().min(1),
  notes: z.string().optional(),
});
