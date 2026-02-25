import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { requireOrgMember, requirePermission, apiSuccess, apiError, handleApiError } from "@/lib/api-helpers";
import { parsePagination, paginatedResult } from "@/lib/pagination";
import { createInventoryTransactionSchema } from "@/lib/validations/inventory";
import { writeAuditLog } from "@/lib/audit";

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireOrgMember();
    const pagination = parsePagination(req);
    const inventoryItemId = req.nextUrl.searchParams.get("inventoryItemId");
    const type = req.nextUrl.searchParams.get("type");
    const dealId = req.nextUrl.searchParams.get("dealId");

    const where: Record<string, unknown> = { orgId: ctx.orgId };
    if (inventoryItemId) where.inventoryItemId = inventoryItemId;
    if (type) where.type = type;
    if (dealId) where.dealId = dealId;

    const [transactions, total] = await Promise.all([
      prisma.inventoryTransaction.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: pagination.skip,
        take: pagination.limit,
      }),
      prisma.inventoryTransaction.count({ where }),
    ]);

    return apiSuccess(paginatedResult(transactions, total, pagination));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requirePermission("shopping:write");
    const body = await req.json();
    const data = createInventoryTransactionSchema.parse(body);

    // Verify the inventory item exists and belongs to this org
    const item = await prisma.inventoryItem.findFirst({
      where: { id: data.inventoryItemId, orgId: ctx.orgId },
    });
    if (!item) return apiError("Inventory item not found", 404);

    const totalCost = data.unitCost ? data.quantity * data.unitCost : 0;

    const result = await prisma.$transaction(async (tx) => {
      const transaction = await tx.inventoryTransaction.create({
        data: {
          orgId: ctx.orgId,
          performedBy: ctx.userId,
          inventoryItemId: data.inventoryItemId,
          type: data.type,
          quantity: data.quantity,
          unitCost: data.unitCost || 0,
          totalCost,
          reference: data.reference,
          referenceType: data.referenceType,
          referenceId: data.referenceId,
          dealId: data.dealId,
          notes: data.notes,
        },
      });

      const updateData: Record<string, unknown> = {
        quantityOnHand: { increment: data.quantity },
      };

      if (data.type === "purchase" && data.unitCost) {
        updateData.lastPurchasePrice = data.unitCost;
      }

      const updatedItem = await tx.inventoryItem.update({
        where: { id: data.inventoryItemId },
        data: updateData,
      });

      return { transaction, item: updatedItem };
    });

    await writeAuditLog({
      orgId: ctx.orgId,
      userId: ctx.userId,
      action: "create",
      entityType: "InventoryTransaction",
      entityId: result.transaction.id,
      metadata: {
        inventoryItemId: data.inventoryItemId,
        type: data.type,
        quantity: data.quantity,
        totalCost,
      },
    });

    return apiSuccess(result, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
