import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { requireOrgMember, requirePermission, apiSuccess, apiError, handleApiError } from "@/lib/api-helpers";
import { updateJournalEntrySchema } from "@/lib/validations/gl";
import { writeAuditLog, diffChanges } from "@/lib/audit";

type Params = { params: Promise<{ entryId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const ctx = await requireOrgMember();
    const { entryId } = await params;

    const entry = await prisma.journalEntry.findFirst({
      where: { id: entryId, orgId: ctx.orgId },
      include: { lines: true },
    });

    if (!entry) return apiError("Journal entry not found", 404);

    return apiSuccess(entry);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const ctx = await requirePermission("accounting:write");
    const { entryId } = await params;
    const body = await req.json();
    const data = updateJournalEntrySchema.parse(body);

    const existing = await prisma.journalEntry.findFirst({
      where: { id: entryId, orgId: ctx.orgId },
      include: { lines: true },
    });
    if (!existing) return apiError("Journal entry not found", 404);
    if (existing.status !== "draft") return apiError("Only draft entries can be updated", 400);

    const updateData: Record<string, unknown> = {};
    if (data.date !== undefined) updateData.date = new Date(data.date);
    if (data.description !== undefined) updateData.description = data.description;
    if (data.reference !== undefined) updateData.reference = data.reference;
    if (data.sourceType !== undefined) updateData.sourceType = data.sourceType;
    if (data.sourceId !== undefined) updateData.sourceId = data.sourceId;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.status !== undefined) updateData.status = data.status;

    let entry;

    if (data.lines) {
      entry = await prisma.$transaction(async (tx) => {
        await tx.journalLine.deleteMany({ where: { journalEntryId: entryId } });
        return tx.journalEntry.update({
          where: { id: entryId },
          data: {
            ...updateData,
            lines: {
              create: data.lines!.map((line) => ({
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
      });
    } else {
      entry = await prisma.journalEntry.update({
        where: { id: entryId },
        data: updateData,
        include: { lines: true },
      });
    }

    const changes = diffChanges(
      existing as unknown as Record<string, unknown>,
      data as unknown as Record<string, unknown>,
      ["date", "description", "reference", "sourceType", "sourceId", "notes", "status", "lines"]
    );

    await writeAuditLog({
      orgId: ctx.orgId,
      userId: ctx.userId,
      action: "update",
      entityType: "JournalEntry",
      entityId: entryId,
      changes,
    });

    return apiSuccess(entry);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const ctx = await requirePermission("accounting:write");
    const { entryId } = await params;

    const existing = await prisma.journalEntry.findFirst({
      where: { id: entryId, orgId: ctx.orgId },
    });
    if (!existing) return apiError("Journal entry not found", 404);
    if (existing.status !== "draft") return apiError("Only draft entries can be deleted", 400);

    await writeAuditLog({
      orgId: ctx.orgId,
      userId: ctx.userId,
      action: "delete",
      entityType: "JournalEntry",
      entityId: entryId,
      metadata: { entryNumber: existing.entryNumber },
    });

    await prisma.journalEntry.delete({ where: { id: entryId } });
    return apiSuccess({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
