import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { requireOrgMember, requirePermission, apiSuccess, handleApiError } from "@/lib/api-helpers";
import { parsePagination, paginatedResult } from "@/lib/pagination";
import { createJournalEntrySchema } from "@/lib/validations/gl";
import { withFinancialTransaction } from "@/lib/financial-transaction";

export async function GET(req: NextRequest) {
  try {
    const ctx = await requirePermission("accounting:read");
    const pagination = parsePagination(req);
    const status = req.nextUrl.searchParams.get("status");
    const startDate = req.nextUrl.searchParams.get("startDate");
    const endDate = req.nextUrl.searchParams.get("endDate");

    const where: Record<string, unknown> = { orgId: ctx.orgId };
    if (status) where.status = status;
    if (startDate || endDate) {
      where.date = {
        ...(startDate ? { gte: new Date(startDate) } : {}),
        ...(endDate ? { lte: new Date(endDate) } : {}),
      };
    }

    const [entries, total] = await Promise.all([
      prisma.journalEntry.findMany({
        where,
        include: { lines: true },
        orderBy: { createdAt: "desc" },
        skip: pagination.skip,
        take: pagination.limit,
      }),
      prisma.journalEntry.count({ where }),
    ]);

    return apiSuccess(paginatedResult(entries, total, pagination));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requirePermission("accounting:write");
    const body = await req.json();
    const data = createJournalEntrySchema.parse(body);

    // Atomic sequence + create inside a single serializable transaction
    const entry = await withFinancialTransaction({
      tx: async (tx) => {
        // Atomic increment via upsert — no COUNT, no scanning, constant-time
        const seq = await tx.journalEntrySequence.upsert({
          where: { orgId: ctx.orgId },
          create: { orgId: ctx.orgId, lastSeq: 1 },
          update: { lastSeq: { increment: 1 } },
        });

        const entryNumber = `JE-${String(seq.lastSeq).padStart(6, "0")}`;

        return tx.journalEntry.create({
          data: {
            orgId: ctx.orgId,
            userId: ctx.userId,
            entryNumber,
            date: new Date(data.date),
            description: data.description,
            reference: data.reference,
            sourceType: data.sourceType,
            sourceId: data.sourceId,
            notes: data.notes,
            status: "draft",
            lines: {
              create: data.lines.map((line) => ({
                accountCode: line.accountCode,
                accountName: line.accountName,
                description: line.description,
                debit: line.debit ?? 0,
                credit: line.credit ?? 0,
                dealId: line.dealId,
                contactId: line.contactId,
              })),
            },
          },
          include: { lines: true },
        });
      },
      audit: (entry) => ({
        orgId: ctx.orgId,
        userId: ctx.userId,
        action: "create",
        entityType: "JournalEntry",
        entityId: entry.id,
        metadata: { entryNumber: entry.entryNumber },
      }),
      isolationLevel: "Serializable",
    });

    return apiSuccess(entry, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
