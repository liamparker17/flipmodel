import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { requireOrgMember, requirePermission, apiSuccess, handleApiError } from "@/lib/api-helpers";
import { parsePagination, paginatedResult } from "@/lib/pagination";
import { createInventoryItemSchema } from "@/lib/validations/inventory";
import { writeAuditLog } from "@/lib/audit";

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireOrgMember();
    const pagination = parsePagination(req);
    const category = req.nextUrl.searchParams.get("category");
    const belowReorderPoint = req.nextUrl.searchParams.get("belowReorderPoint");

    const where: Record<string, unknown> = { orgId: ctx.orgId };
    if (category) where.category = category;

    let items;
    let total;

    if (belowReorderPoint === "true") {
      // Fetch all and filter in memory since Prisma doesn't support column-to-column comparison
      const allItems = await prisma.inventoryItem.findMany({
        where: {
          orgId: ctx.orgId,
          ...(category ? { category } : {}),
          reorderPoint: { gt: 0 },
        },
        orderBy: { createdAt: "desc" },
      });

      const filtered = allItems.filter((item) => item.quantityOnHand <= item.reorderPoint);
      total = filtered.length;
      items = filtered.slice(pagination.skip, pagination.skip + pagination.limit);
    } else {
      [items, total] = await Promise.all([
        prisma.inventoryItem.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: pagination.skip,
          take: pagination.limit,
        }),
        prisma.inventoryItem.count({ where }),
      ]);
    }

    const response = apiSuccess(paginatedResult(items, total, pagination));
    response.headers.set("Cache-Control", "private, max-age=30, stale-while-revalidate=60");
    return response;
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requirePermission("shopping:write");
    const body = await req.json();
    const data = createInventoryItemSchema.parse(body);

    const item = await prisma.inventoryItem.create({
      data: {
        orgId: ctx.orgId,
        sku: data.sku,
        name: data.name,
        description: data.description,
        category: data.category,
        unit: data.unit,
        reorderPoint: data.reorderPoint || 0,
        reorderQuantity: data.reorderQuantity || 0,
        costPrice: data.costPrice || 0,
        quantityOnHand: 0,
        location: data.location,
        notes: data.notes,
      },
    });

    await writeAuditLog({
      orgId: ctx.orgId,
      userId: ctx.userId,
      action: "create",
      entityType: "InventoryItem",
      entityId: item.id,
      metadata: { sku: data.sku },
    });

    return apiSuccess(item, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
