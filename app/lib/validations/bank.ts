import { z } from "zod";

export const createBankAccountSchema = z.object({
  name: z.string().min(1),
  bankName: z.string().min(1),
  accountNumber: z.string().min(1),
  branchCode: z.string().optional(),
  accountType: z.string().optional(),
  currency: z.string().optional(),
  currentBalance: z.number().optional(),
  accountCode: z.string().optional(),
});

export const updateBankAccountSchema = createBankAccountSchema.partial();

export const createBankTransactionSchema = z.object({
  bankAccountId: z.string().min(1),
  date: z.string().min(1),
  description: z.string().min(1),
  amount: z.number(),
  reference: z.string().optional(),
  type: z.string().optional(),
  category: z.string().optional(),
});

export const updateBankTransactionSchema = createBankTransactionSchema.partial().omit({ bankAccountId: true });

export const reconcileTransactionSchema = z.object({
  matchedEntityType: z.string().min(1),
  matchedEntityId: z.string().min(1),
});
