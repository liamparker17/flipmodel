import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { requireOrgMember, requirePermission, apiSuccess, handleApiError } from "@/lib/api-helpers";
import { parsePagination, paginatedResult } from "@/lib/pagination";
import { createJournalEntrySchema } from "@/lib/validations/gl";
import { writeAuditLog } from "@/lib/audit";

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireOrgMember();
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

    // Auto-generate entry number
    const count = await prisma.journalEntry.count({ where: { orgId: ctx.orgId } });
    const entryNumber = `JE-${String(count + 1).padStart(6, "0")}`;

    const entry = await prisma.journalEntry.create({
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

    await writeAuditLog({
      orgId: ctx.orgId,
      userId: ctx.userId,
      action: "create",
      entityType: "JournalEntry",
      entityId: entry.id,
      metadata: { entryNumber },
    });

    return apiSuccess(entry, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
