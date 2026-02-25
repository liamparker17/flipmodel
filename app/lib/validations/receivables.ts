import { z } from "zod";

export const createReceivableSchema = z.object({
  invoiceId: z.string().optional(),
  contactId: z.string().optional(),
  dealId: z.string().optional(),
  totalAmount: z.number().positive(),
  dueDate: z.string().optional(),
  currency: z.string().optional(),
  notes: z.string().optional(),
});

export const updateReceivableSchema = z.object({
  invoiceId: z.string().optional(),
  contactId: z.string().optional(),
  dealId: z.string().optional(),
  totalAmount: z.number().positive().optional(),
  dueDate: z.string().optional(),
  currency: z.string().optional(),
  notes: z.string().optional(),
});

export const createReceivablePaymentSchema = z.object({
  amount: z.number().positive(),
  paymentDate: z.string().min(1),
  paymentMethod: z.string().optional(),
  reference: z.string().optional(),
  bankAccountId: z.string().optional(),
  notes: z.string().optional(),
});
