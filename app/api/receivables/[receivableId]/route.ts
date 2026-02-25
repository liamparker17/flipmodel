import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { requireOrgMember, requirePermission, apiSuccess, apiError, handleApiError } from "@/lib/api-helpers";
import { updateReceivableSchema } from "@/lib/validations/receivables";
import { writeAuditLog, diffChanges } from "@/lib/audit";

type Params = { params: Promise<{ receivableId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const ctx = await requireOrgMember();
    const { receivableId } = await params;

    const receivable = await prisma.customerReceivable.findFirst({
      where: { id: receivableId, orgId: ctx.orgId },
      include: { payments: true },
    });

    if (!receivable) return apiError("Receivable not found", 404);

    return apiSuccess(receivable);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const ctx = await requirePermission("accounting:write");
    const { receivableId } = await params;
    const body = await req.json();
    const data = updateReceivableSchema.parse(body);

    const existing = await prisma.customerReceivable.findFirst({
      where: { id: receivableId, orgId: ctx.orgId },
    });
    if (!existing) return apiError("Receivable not found", 404);

    const updateData: Record<string, unknown> = {};
    if (data.invoiceId !== undefined) updateData.invoiceId = data.invoiceId;
    if (data.contactId !== undefined) updateData.contactId = data.contactId;
    if (data.dealId !== undefined) updateData.dealId = data.dealId;
    if (data.totalAmount !== undefined) updateData.totalAmount = data.totalAmount;
    if (data.dueDate !== undefined) updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
    if (data.currency !== undefined) updateData.currency = data.currency;
    if (data.notes !== undefined) updateData.notes = data.notes;

    const receivable = await prisma.customerReceivable.update({
      where: { id: receivableId },
      data: updateData,
    });

    const changes = diffChanges(
      existing as unknown as Record<string, unknown>,
      data as unknown as Record<string, unknown>,
      ["invoiceId", "contactId", "dealId", "totalAmount", "dueDate", "currency", "notes"]
    );

    await writeAuditLog({
      orgId: ctx.orgId,
      userId: ctx.userId,
      action: "update",
      entityType: "Receivable",
      entityId: receivableId,
      changes,
    });

    return apiSuccess(receivable);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const ctx = await requirePermission("accounting:write");
    const { receivableId } = await params;

    const existing = await prisma.customerReceivable.findFirst({
      where: { id: receivableId, orgId: ctx.orgId },
    });
    if (!existing) return apiError("Receivable not found", 404);
    if (existing.status !== "outstanding") return apiError("Only outstanding receivables can be deleted", 400);
    if (existing.amountPaid !== 0) return apiError("Cannot delete receivable with payments recorded", 400);

    await writeAuditLog({
      orgId: ctx.orgId,
      userId: ctx.userId,
      action: "delete",
      entityType: "Receivable",
      entityId: receivableId,
    });

    await prisma.customerReceivable.delete({ where: { id: receivableId } });
    return apiSuccess({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
