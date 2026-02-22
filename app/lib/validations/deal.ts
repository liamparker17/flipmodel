import { z } from "zod";

export const createDealSchema = z.object({
  name: z.string().min(1, "Deal name is required").max(200),
  address: z.string().max(500).optional(),
  purchasePrice: z.number().min(0).optional(),
  expectedSalePrice: z.number().min(0).optional(),
  stage: z.string().optional(),
  priority: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  data: z.any().optional(),
});

export const updateDealSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  address: z.string().max(500).optional(),
  purchasePrice: z.number().min(0).optional(),
  expectedSalePrice: z.number().min(0).optional(),
  actualSalePrice: z.number().min(0).nullable().optional(),
  stage: z.string().optional(),
  priority: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  data: z.any().optional(),
  offerAmount: z.number().min(0).nullable().optional(),
  offerDate: z.string().nullable().optional(),
  purchaseDate: z.string().nullable().optional(),
  transferDate: z.string().nullable().optional(),
  listedDate: z.string().nullable().optional(),
  soldDate: z.string().nullable().optional(),
  actualSaleDate: z.string().nullable().optional(),
});
