import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { requirePermission, apiSuccess, apiError, handleApiError } from "@/lib/api-helpers";
import { approvePurchaseOrderSchema } from "@/lib/validations/purchase-orders";
import { writeAuditLog } from "@/lib/audit";

type Params = { params: Promise<{ poId: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const ctx = await requirePermission("expenses:approve");
    const { poId } = await params;
    const body = await req.json();
    approvePurchaseOrderSchema.parse(body);

    const existing = await prisma.purchaseOrder.findFirst({
      where: { id: poId, orgId: ctx.orgId },
    });
    if (!existing) return apiError("Purchase order not found", 404);
    if (existing.status !== "draft" && existing.status !== "submitted") {
      return apiError("Only draft or submitted purchase orders can be approved", 400);
    }

    const order = await prisma.purchaseOrder.update({
      where: { id: poId },
      data: {
        status: "approved",
        approvedBy: ctx.userId,
        approvedAt: new Date(),
      },
      include: { lines: true },
    });

    await writeAuditLog({
      orgId: ctx.orgId,
      userId: ctx.userId,
      action: "approve",
      entityType: "PurchaseOrder",
      entityId: poId,
      metadata: { poNumber: existing.poNumber },
    });

    return apiSuccess(order);
  } catch (error) {
    return handleApiError(error);
  }
}
