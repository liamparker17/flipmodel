import { z } from "zod";

const billLineSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().positive().default(1),
  unitPrice: z.number().min(0),
  amount: z.number().min(0),
  accountCode: z.string().optional(),
  dealId: z.string().optional(),
});

export const createVendorBillSchema = z.object({
  billNumber: z.string().min(1),
  contactId: z.string().optional(),
  dealId: z.string().optional(),
  issueDate: z.string().optional(),
  dueDate: z.string().optional(),
  subtotal: z.number().min(0),
  tax: z.number().min(0),
  total: z.number().min(0),
  currency: z.string().optional(),
  notes: z.string().optional(),
  documentUrl: z.string().optional(),
  lines: z.array(billLineSchema),
});

export const updateVendorBillSchema = z.object({
  billNumber: z.string().optional(),
  contactId: z.string().optional(),
  dealId: z.string().optional(),
  issueDate: z.string().optional(),
  dueDate: z.string().optional(),
  subtotal: z.number().min(0).optional(),
  tax: z.number().min(0).optional(),
  total: z.number().min(0).optional(),
  currency: z.string().optional(),
  notes: z.string().optional(),
  documentUrl: z.string().optional(),
  lines: z.array(billLineSchema).optional(),
});

export const createBillPaymentSchema = z.object({
  amount: z.number().positive(),
  paymentDate: z.string().min(1),
  paymentMethod: z.string().optional(),
  reference: z.string().optional(),
  bankAccountId: z.string().optional(),
  notes: z.string().optional(),
});
