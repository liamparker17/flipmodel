import { z } from "zod";

export const createContactSchema = z.object({
  name: z.string().min(1),
  role: z.string().optional(),
  company: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  notes: z.string().optional(),
  profession: z.string().optional(),
  dailyRate: z.number().optional(),
  bankName: z.string().optional(),
  accountNumber: z.string().optional(),
  branchCode: z.string().optional(),
  accountType: z.string().optional(),
});

export const updateContactSchema = createContactSchema.partial();
