import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { requireOrgMember, requirePermission, apiSuccess, apiError, handleApiError } from "@/lib/api-helpers";
import { updateInventoryItemSchema } from "@/lib/validations/inventory";
import { writeAuditLog, diffChanges } from "@/lib/audit";

type Params = { params: Promise<{ itemId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const ctx = await requireOrgMember();
    const { itemId } = await params;

    const item = await prisma.inventoryItem.findFirst({
      where: { id: itemId, orgId: ctx.orgId },
      include: {
        transactions: {
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    });

    if (!item) return apiError("Inventory item not found", 404);

    return apiSuccess(item);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const ctx = await requirePermission("shopping:write");
    const { itemId } = await params;
    const body = await req.json();
    const data = updateInventoryItemSchema.parse(body);

    const existing = await prisma.inventoryItem.findFirst({
      where: { id: itemId, orgId: ctx.orgId },
    });
    if (!existing) return apiError("Inventory item not found", 404);

    const updateData: Record<string, unknown> = {};
    if (data.sku !== undefined) updateData.sku = data.sku;
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.unit !== undefined) updateData.unit = data.unit;
    if (data.reorderPoint !== undefined) updateData.reorderPoint = data.reorderPoint;
    if (data.reorderQuantity !== undefined) updateData.reorderQuantity = data.reorderQuantity;
    if (data.costPrice !== undefined) updateData.costPrice = data.costPrice;
    if (data.location !== undefined) updateData.location = data.location;
    if (data.notes !== undefined) updateData.notes = data.notes;

    const item = await prisma.inventoryItem.update({
      where: { id: itemId },
      data: updateData,
    });

    const changes = diffChanges(
      existing as unknown as Record<string, unknown>,
      data as unknown as Record<string, unknown>,
      ["sku", "name", "description", "category", "unit", "reorderPoint", "reorderQuantity", "costPrice", "location", "notes"]
    );

    await writeAuditLog({
      orgId: ctx.orgId,
      userId: ctx.userId,
      action: "update",
      entityType: "InventoryItem",
      entityId: itemId,
      changes,
    });

    return apiSuccess(item);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const ctx = await requirePermission("shopping:write");
    const { itemId } = await params;

    const existing = await prisma.inventoryItem.findFirst({
      where: { id: itemId, orgId: ctx.orgId },
    });
    if (!existing) return apiError("Inventory item not found", 404);
    if (existing.quantityOnHand !== 0) return apiError("Cannot delete inventory item with stock on hand", 400);

    await writeAuditLog({
      orgId: ctx.orgId,
      userId: ctx.userId,
      action: "delete",
      entityType: "InventoryItem",
      entityId: itemId,
      metadata: { sku: existing.sku },
    });

    await prisma.inventoryItem.delete({ where: { id: itemId } });
    return apiSuccess({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
