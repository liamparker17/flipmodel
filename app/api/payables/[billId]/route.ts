import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { requireOrgMember, requirePermission, apiSuccess, apiError, handleApiError } from "@/lib/api-helpers";
import { updateVendorBillSchema } from "@/lib/validations/payables";
import { writeAuditLog, diffChanges } from "@/lib/audit";
import { checkOptimisticLock } from "@/lib/optimistic-lock";

type Params = { params: Promise<{ billId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const ctx = await requirePermission("payables:read");
    const { billId } = await params;

    const bill = await prisma.vendorBill.findFirst({
      where: { id: billId, orgId: ctx.orgId },
      include: { lines: true, payments: true },
    });

    if (!bill) return apiError("Vendor bill not found", 404);

    return apiSuccess(bill);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const ctx = await requirePermission("accounting:write");
    const { billId } = await params;
    const body = await req.json();
    const data = updateVendorBillSchema.parse(body);

    const existing = await prisma.vendorBill.findFirst({
      where: { id: billId, orgId: ctx.orgId },
      include: { lines: true },
    });
    if (!existing) return apiError("Vendor bill not found", 404);
    if (existing.status !== "draft" && existing.status !== "approved") {
      return apiError("Only draft or approved bills can be updated", 400);
    }

    const lockError = checkOptimisticLock(body, existing.version);
    if (lockError) return lockError;

    const updateData: Record<string, unknown> = {};
    if (data.billNumber !== undefined) updateData.billNumber = data.billNumber;
    if (data.contactId !== undefined) updateData.contactId = data.contactId;
    if (data.dealId !== undefined) updateData.dealId = data.dealId;
    if (data.issueDate !== undefined) updateData.issueDate = new Date(data.issueDate);
    if (data.dueDate !== undefined) updateData.dueDate = new Date(data.dueDate);
    if (data.subtotal !== undefined) updateData.subtotal = data.subtotal;
    if (data.tax !== undefined) updateData.tax = data.tax;
    if (data.total !== undefined) updateData.total = data.total;
    if (data.currency !== undefined) updateData.currency = data.currency;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.documentUrl !== undefined) updateData.documentUrl = data.documentUrl;

    let bill;

    if (data.lines) {
      bill = await prisma.$transaction(async (tx) => {
        await tx.vendorBillLine.deleteMany({ where: { vendorBillId: billId } });
        return tx.vendorBill.update({
          where: { id: billId },
          data: {
            ...updateData,
            version: { increment: 1 },
            lines: {
              create: data.lines!.map((line) => ({
                description: line.description,
                quantity: line.quantity ?? 1,
                unitPrice: line.unitPrice,
                amount: line.amount,
                accountCode: line.accountCode,
                dealId: line.dealId,
              })),
            },
          },
          include: { lines: true },
        });
      });
    } else {
      bill = await prisma.vendorBill.update({
        where: { id: billId },
        data: { ...updateData, version: { increment: 1 } },
        include: { lines: true },
      });
    }

    const changes = diffChanges(
      existing as unknown as Record<string, unknown>,
      data as unknown as Record<string, unknown>,
      ["billNumber", "contactId", "dealId", "issueDate", "dueDate", "subtotal", "tax", "total", "currency", "notes", "documentUrl", "lines"]
    );

    await writeAuditLog({
      orgId: ctx.orgId,
      userId: ctx.userId,
      action: "update",
      entityType: "VendorBill",
      entityId: billId,
      changes,
    });

    return apiSuccess(bill);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const ctx = await requirePermission("accounting:write");
    const { billId } = await params;

    const existing = await prisma.vendorBill.findFirst({
      where: { id: billId, orgId: ctx.orgId },
    });
    if (!existing) return apiError("Vendor bill not found", 404);
    if (existing.status !== "draft") return apiError("Only draft bills can be deleted", 400);

    await writeAuditLog({
      orgId: ctx.orgId,
      userId: ctx.userId,
      action: "delete",
      entityType: "VendorBill",
      entityId: billId,
      metadata: { billNumber: existing.billNumber },
    });

    await prisma.vendorBill.delete({ where: { id: billId } });
    return apiSuccess({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
