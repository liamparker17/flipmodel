import { NextRequest } from "next/server";
import { requirePermission, apiSuccess, apiError, handleApiError, ValidationError, NotFoundError } from "@/lib/api-helpers";
import { postJournalEntrySchema } from "@/lib/validations/gl";
import { withFinancialTransaction } from "@/lib/financial-transaction";

type Params = { params: Promise<{ entryId: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const ctx = await requirePermission("accounting:write");
    const { entryId } = await params;
    const body = await req.json().catch(() => ({}));
    postJournalEntrySchema.parse(body);

    const entry = await withFinancialTransaction({
      tx: async (tx) => {
        // Re-fetch entry + lines inside Serializable transaction — never trust stale data
        const existing = await tx.journalEntry.findFirst({
          where: { id: entryId, orgId: ctx.orgId },
          include: { lines: true },
        });

        if (!existing) throw new NotFoundError("Journal entry not found");
        if (existing.status !== "draft") {
          throw new ValidationError("INVALID_STATUS", "Only draft entries can be posted");
        }

        if (existing.lines.length === 0) {
          throw new ValidationError("NO_LINES", "Journal entry must have at least one line");
        }

        // Re-validate debit/credit balance from DB state
        const totalDebits = existing.lines.reduce((sum, l) => sum + l.debit, 0);
        const totalCredits = existing.lines.reduce((sum, l) => sum + l.credit, 0);

        if (Math.abs(totalDebits - totalCredits) >= 0.01) {
          throw new ValidationError(
            "UNBALANCED_ENTRY",
            `Journal entry is unbalanced. Debits: ${totalDebits.toFixed(2)}, Credits: ${totalCredits.toFixed(2)}`,
          );
        }

        // Validate all account codes exist in ChartOfAccount for this org
        const accountCodes = [...new Set(existing.lines.map((l) => l.accountCode))];
        const validAccounts = await tx.chartOfAccount.findMany({
          where: { orgId: ctx.orgId, code: { in: accountCodes }, isActive: true },
          select: { code: true },
        });
        const validCodes = new Set(validAccounts.map((a) => a.code));
        const invalidCodes = accountCodes.filter((c) => !validCodes.has(c));

        if (invalidCodes.length > 0) {
          throw new ValidationError(
            "INVALID_ACCOUNT_CODES",
            `Invalid or inactive account codes: ${invalidCodes.join(", ")}`,
          );
        }

        // Financial period enforcement — reject if entry date falls in closed/locked period
        const entryDate = existing.date;
        const period = await tx.financialPeriod.findFirst({
          where: {
            orgId: ctx.orgId,
            startDate: { lte: entryDate },
            endDate: { gte: entryDate },
          },
        });

        if (period && period.status !== "open") {
          throw new ValidationError(
            "PERIOD_CLOSED",
            `Cannot post to financial period "${period.name}" — period is ${period.status}`,
          );
        }

        // Post the entry with period assignment
        return tx.journalEntry.update({
          where: { id: entryId },
          data: {
            status: "posted",
            postedAt: new Date(),
            postedBy: ctx.userId,
            periodName: period?.name ?? null,
          },
          include: { lines: true },
        });
      },
      audit: (entry) => ({
        orgId: ctx.orgId,
        userId: ctx.userId,
        action: "post",
        entityType: "JournalEntry",
        entityId: entryId,
        metadata: {
          entryNumber: entry.entryNumber,
          periodName: entry.periodName,
        },
      }),
      isolationLevel: "Serializable",
    });

    return apiSuccess(entry);
  } catch (error) {
    return handleApiError(error);
  }
}
