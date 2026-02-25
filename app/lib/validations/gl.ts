import { z } from "zod";

const journalLineSchema = z.object({
  accountCode: z.string().min(1),
  accountName: z.string().min(1),
  description: z.string().optional(),
  debit: z.number().min(0).default(0),
  credit: z.number().min(0).default(0),
  dealId: z.string().optional(),
  contactId: z.string().optional(),
});

export const createJournalEntrySchema = z
  .object({
    date: z.string().min(1),
    description: z.string().min(1),
    reference: z.string().optional(),
    sourceType: z.string().optional(),
    sourceId: z.string().optional(),
    notes: z.string().optional(),
    lines: z.array(journalLineSchema).min(1, "At least one journal line is required"),
  })
  .refine(
    (data) => {
      const totalDebits = data.lines.reduce((sum, l) => sum + (l.debit ?? 0), 0);
      const totalCredits = data.lines.reduce((sum, l) => sum + (l.credit ?? 0), 0);
      return Math.abs(totalDebits - totalCredits) < 0.001;
    },
    { message: "Total debits must equal total credits" }
  );

export const updateJournalEntrySchema = z.object({
  date: z.string().optional(),
  description: z.string().optional(),
  reference: z.string().optional(),
  sourceType: z.string().optional(),
  sourceId: z.string().optional(),
  notes: z.string().optional(),
  status: z.string().optional(),
  lines: z.array(journalLineSchema).optional(),
});

export const postJournalEntrySchema = z.object({});
