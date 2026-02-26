import { NextRequest } from "next/server";
import { requirePermission, apiSuccess, handleApiError, ValidationError, NotFoundError } from "@/lib/api-helpers";
import { withFinancialTransaction } from "@/lib/financial-transaction";

type Params = { params: Promise<{ entryId: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const ctx = await requirePermission("accounting:write");
    const { entryId } = await params;
    const body = await req.json().catch(() => ({}));
    const reversalDate = (body as { date?: string }).date;

    const result = await withFinancialTransaction({
      tx: async (tx) => {
        // Fetch original entry inside Serializable transaction
        const original = await tx.journalEntry.findFirst({
          where: { id: entryId, orgId: ctx.orgId },
          include: { lines: true },
        });

        if (!original) throw new NotFoundError("Journal entry not found");

        if (original.status !== "posted") {
          throw new ValidationError(
            "INVALID_STATUS",
            "Only posted entries can be reversed",
          );
        }

        // Prevent double reversal — check if a reversal already exists
        const existingReversal = await tx.journalEntry.findFirst({
          where: { orgId: ctx.orgId, reversalOf: entryId },
        });

        if (existingReversal) {
          throw new ValidationError(
            "ALREADY_REVERSED",
            `Entry already reversed by ${existingReversal.entryNumber}`,
          );
        }

        // Generate new entry number
        const seq = await tx.journalEntrySequence.upsert({
          where: { orgId: ctx.orgId },
          create: { orgId: ctx.orgId, lastSeq: 1 },
          update: { lastSeq: { increment: 1 } },
        });
        const entryNumber = `JE-${String(seq.lastSeq).padStart(6, "0")}`;

        const reversalEntryDate = reversalDate ? new Date(reversalDate) : new Date();

        // Validate reversal date is not in a closed period
        const period = await tx.financialPeriod.findFirst({
          where: {
            orgId: ctx.orgId,
            startDate: { lte: reversalEntryDate },
            endDate: { gte: reversalEntryDate },
          },
        });

        if (period && period.status !== "open") {
          throw new ValidationError(
            "PERIOD_CLOSED",
            `Cannot post reversal into financial period "${period.name}" — period is ${period.status}`,
          );
        }

        // Create reversal entry with mirrored debit/credit
        const reversalEntry = await tx.journalEntry.create({
          data: {
            orgId: ctx.orgId,
            userId: ctx.userId,
            entryNumber,
            date: reversalEntryDate,
            description: `Reversal of ${original.entryNumber}: ${original.description}`,
            reference: original.reference,
            sourceType: "reversal",
            sourceId: original.id,
            reversalOf: original.id,
            status: "posted",
            postedAt: new Date(),
            postedBy: ctx.userId,
            periodName: period?.name ?? null,
            notes: `Reversal of journal entry ${original.entryNumber}`,
            lines: {
              create: original.lines.map((line) => ({
                accountCode: line.accountCode,
                accountName: line.accountName,
                description: `Reversal: ${line.description || ""}`,
                debit: line.credit,   // Mirror: original credit becomes debit
                credit: line.debit,   // Mirror: original debit becomes credit
                dealId: line.dealId,
                contactId: line.contactId,
              })),
            },
          },
          include: { lines: true },
        });

        // Mark original as reversed
        await tx.journalEntry.update({
          where: { id: entryId },
          data: { status: "reversed" },
        });

        return reversalEntry;
      },
      audit: (reversalEntry) => ({
        orgId: ctx.orgId,
        userId: ctx.userId,
        action: "reverse",
        entityType: "JournalEntry",
        entityId: entryId,
        metadata: {
          originalEntryId: entryId,
          reversalEntryId: reversalEntry.id,
          reversalEntryNumber: reversalEntry.entryNumber,
        },
      }),
      isolationLevel: "Serializable",
    });

    return apiSuccess(result, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
