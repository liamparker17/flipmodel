import { z } from "zod";

export const createExpenseSchema = z.object({
  dealId: z.string().min(1),
  category: z.string().min(1),
  description: z.string().min(1),
  amount: z.number(),
  date: z.string(),
  vendor: z.string().optional(),
  paymentMethod: z.string().optional(),
  receiptRef: z.string().optional(),
  notes: z.string().optional(),
  isProjected: z.boolean().optional(),
  milestoneId: z.string().optional(),
  contractorId: z.string().optional(),
});

export const updateExpenseSchema = z.object({
  category: z.string().optional(),
  description: z.string().optional(),
  amount: z.number().optional(),
  date: z.string().optional(),
  vendor: z.string().optional(),
  paymentMethod: z.string().optional(),
  receiptRef: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  isProjected: z.boolean().optional(),
  milestoneId: z.string().nullable().optional(),
  contractorId: z.string().nullable().optional(),
  signOffStatus: z.string().optional(),
  signOffPmNotes: z.string().nullable().optional(),
});
