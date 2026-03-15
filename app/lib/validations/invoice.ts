import { z } from "zod";

export const createInvoiceSchema = z.object({
  dealId: z.string().optional(),
  contactId: z.string().optional(),
  invoiceNumber: z.string().min(1),
  status: z.string().optional(),
  issueDate: z.string().optional(),
  dueDate: z.string().optional(),
  subtotal: z.number().optional(),
  tax: z.number().optional(),
  total: z.number().optional(),
  notes: z.string().optional(),
  lineItems: z.array(z.object({
    description: z.string().min(1).max(500),
    quantity: z.number().positive(),
    unitPrice: z.number().min(0),
    amount: z.number().min(0),
  })).optional(),
});
