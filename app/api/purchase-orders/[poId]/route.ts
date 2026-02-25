import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { requireOrgMember, requirePermission, apiSuccess, apiError, handleApiError } from "@/lib/api-helpers";
import { updatePurchaseOrderSchema } from "@/lib/validations/purchase-orders";
import { writeAuditLog, diffChanges } from "@/lib/audit";

type Params = { params: Promise<{ poId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const ctx = await requireOrgMember();
    const { poId } = await params;

    const order = await prisma.purchaseOrder.findFirst({
      where: { id: poId, orgId: ctx.orgId },
      include: { lines: true, receipts: true },
    });

    if (!order) return apiError("Purchase order not found", 404);

    return apiSuccess(order);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const ctx = await requirePermission("shopping:write");
    const { poId } = await params;
    const body = await req.json();
    const data = updatePurchaseOrderSchema.parse(body);

    const existing = await prisma.purchaseOrder.findFirst({
      where: { id: poId, orgId: ctx.orgId },
    });
    if (!existing) return apiError("Purchase order not found", 404);
    if (existing.status !== "draft") return apiError("Only draft purchase orders can be updated", 400);

    const updateData: Record<string, unknown> = {};
    if (data.contactId !== undefined) updateData.contactId = data.contactId;
    if (data.dealId !== undefined) updateData.dealId = data.dealId;
    if (data.orderDate !== undefined) updateData.orderDate = data.orderDate ? new Date(data.orderDate) : null;
    if (data.expectedDate !== undefined) updateData.expectedDate = data.expectedDate ? new Date(data.expectedDate) : null;
    if (data.subtotal !== undefined) updateData.subtotal = data.subtotal;
    if (data.tax !== undefined) updateData.tax = data.tax;
    if (data.total !== undefined) updateData.total = data.total;
    if (data.shippingCost !== undefined) updateData.shippingCost = data.shippingCost;
    if (data.currency !== undefined) updateData.currency = data.currency;
    if (data.deliveryAddress !== undefined) updateData.deliveryAddress = data.deliveryAddress;
    if (data.notes !== undefined) updateData.notes = data.notes;

    let order;

    if (data.lines) {
      order = await prisma.$transaction(async (tx) => {
        await tx.purchaseOrderLine.deleteMany({ where: { purchaseOrderId: poId } });
        return tx.purchaseOrder.update({
          where: { id: poId },
          data: {
            ...updateData,
            lines: {
              create: data.lines!.map((line) => ({
                description: line.description,
                quantity: line.quantity,
                unitPrice: line.unitPrice,
                amount: line.amount,
                inventoryItemId: line.inventoryItemId,
                accountCode: line.accountCode,
              })),
            },
          },
          include: { lines: true },
        });
      });
    } else {
      order = await prisma.purchaseOrder.update({
        where: { id: poId },
        data: updateData,
        include: { lines: true },
      });
    }

    const changes = diffChanges(
      existing as unknown as Record<string, unknown>,
      data as unknown as Record<string, unknown>,
      ["contactId", "dealId", "orderDate", "expectedDate", "subtotal", "tax", "total", "shippingCost", "currency", "deliveryAddress", "notes"]
    );

    await writeAuditLog({
      orgId: ctx.orgId,
      userId: ctx.userId,
      action: "update",
      entityType: "PurchaseOrder",
      entityId: poId,
      changes,
    });

    return apiSuccess(order);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const ctx = await requirePermission("shopping:write");
    const { poId } = await params;

    const existing = await prisma.purchaseOrder.findFirst({
      where: { id: poId, orgId: ctx.orgId },
    });
    if (!existing) return apiError("Purchase order not found", 404);
    if (existing.status !== "draft") return apiError("Only draft purchase orders can be deleted", 400);

    await writeAuditLog({
      orgId: ctx.orgId,
      userId: ctx.userId,
      action: "delete",
      entityType: "PurchaseOrder",
      entityId: poId,
      metadata: { poNumber: existing.poNumber },
    });

    await prisma.purchaseOrder.delete({ where: { id: poId } });
    return apiSuccess({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
