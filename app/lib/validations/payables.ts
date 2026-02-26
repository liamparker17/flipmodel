import { z } from "zod";

const CURRENCY_CODES = ["ZAR", "USD", "EUR", "GBP"] as const;
const PAYMENT_METHODS = ["eft", "cash", "card", "cheque"] as const;

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
  currency: z.enum(CURRENCY_CODES).default("ZAR"),
  notes: z.string().optional(),
  documentUrl: z.string().optional(),
  lines: z.array(billLineSchema).min(1, "At least one line is required"),
}).refine(
  (data) => Math.abs((data.subtotal + data.tax) - data.total) < 0.01,
  { message: "Total must equal subtotal + tax" },
).refine(
  (data) => {
    const lineSum = data.lines.reduce((sum, l) => sum + l.amount, 0);
    return Math.abs(lineSum - data.subtotal) < 0.01;
  },
  { message: "Line amounts must sum to subtotal" },
);

export const updateVendorBillSchema = z.object({
  billNumber: z.string().optional(),
  contactId: z.string().optional(),
  dealId: z.string().optional(),
  issueDate: z.string().optional(),
  dueDate: z.string().optional(),
  subtotal: z.number().min(0).optional(),
  tax: z.number().min(0).optional(),
  total: z.number().min(0).optional(),
  currency: z.enum(CURRENCY_CODES).optional(),
  notes: z.string().optional(),
  documentUrl: z.string().optional(),
  lines: z.array(billLineSchema).optional(),
});

export const createBillPaymentSchema = z.object({
  amount: z.number().positive(),
  paymentDate: z.string().min(1),
  paymentMethod: z.enum(PAYMENT_METHODS).default("eft"),
  reference: z.string().optional(),
  bankAccountId: z.string().optional(),
  notes: z.string().optional(),
});
