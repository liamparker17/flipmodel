import { describe, it, expect } from "vitest";
import { createJournalEntrySchema } from "../gl";

describe("createJournalEntrySchema", () => {
  const validEntry = {
    date: "2026-01-15",
    description: "Test journal entry",
    lines: [
      { accountCode: "1000", accountName: "Cash", debit: 1000, credit: 0 },
      { accountCode: "4000", accountName: "Revenue", debit: 0, credit: 1000 },
    ],
  };

  it("accepts valid balanced entry", () => {
    const result = createJournalEntrySchema.safeParse(validEntry);
    expect(result.success).toBe(true);
  });

  it("rejects unbalanced entry", () => {
    const unbalanced = {
      ...validEntry,
      lines: [
        { accountCode: "1000", accountName: "Cash", debit: 1000, credit: 0 },
        { accountCode: "4000", accountName: "Revenue", debit: 0, credit: 500 },
      ],
    };
    const result = createJournalEntrySchema.safeParse(unbalanced);
    expect(result.success).toBe(false);
  });

  it("rejects missing date", () => {
    const { date, ...noDate } = validEntry;
    const result = createJournalEntrySchema.safeParse(noDate);
    expect(result.success).toBe(false);
  });

  it("rejects missing description", () => {
    const { description, ...noDesc } = validEntry;
    const result = createJournalEntrySchema.safeParse(noDesc);
    expect(result.success).toBe(false);
  });

  it("rejects empty lines array", () => {
    const result = createJournalEntrySchema.safeParse({ ...validEntry, lines: [] });
    expect(result.success).toBe(false);
  });

  it("accepts entry with optional fields", () => {
    const result = createJournalEntrySchema.safeParse({
      ...validEntry,
      reference: "INV-001",
      sourceType: "invoice",
      sourceId: "abc123",
      notes: "Monthly revenue",
    });
    expect(result.success).toBe(true);
  });

  it("accepts entry balanced with floating point tolerance", () => {
    const entry = {
      date: "2026-01-15",
      description: "Float test",
      lines: [
        { accountCode: "1000", accountName: "Cash", debit: 33.33, credit: 0 },
        { accountCode: "1001", accountName: "Cash 2", debit: 33.33, credit: 0 },
        { accountCode: "1002", accountName: "Cash 3", debit: 33.34, credit: 0 },
        { accountCode: "4000", accountName: "Revenue", debit: 0, credit: 100 },
      ],
    };
    const result = createJournalEntrySchema.safeParse(entry);
    expect(result.success).toBe(true);
  });
});
