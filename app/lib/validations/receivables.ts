import { z } from "zod";

const CURRENCY_CODES = ["ZAR", "USD", "EUR", "GBP"] as const;
const PAYMENT_METHODS = ["eft", "cash", "card", "cheque"] as const;

export const createReceivableSchema = z.object({
  invoiceId: z.string().optional(),
  contactId: z.string().optional(),
  dealId: z.string().optional(),
  totalAmount: z.number().positive(),
  dueDate: z.string().optional(),
  currency: z.enum(CURRENCY_CODES).default("ZAR"),
  notes: z.string().optional(),
});

export const updateReceivableSchema = z.object({
  invoiceId: z.string().optional(),
  contactId: z.string().optional(),
  dealId: z.string().optional(),
  totalAmount: z.number().positive().optional(),
  dueDate: z.string().optional(),
  currency: z.enum(CURRENCY_CODES).optional(),
  notes: z.string().optional(),
});

export const createReceivablePaymentSchema = z.object({
  amount: z.number().positive(),
  paymentDate: z.string().min(1),
  paymentMethod: z.enum(PAYMENT_METHODS).default("eft"),
  reference: z.string().optional(),
  bankAccountId: z.string().optional(),
  notes: z.string().optional(),
});
