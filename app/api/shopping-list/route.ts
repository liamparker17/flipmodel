import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { requireOrgMember, requirePermission, apiSuccess, apiError, handleApiError } from "@/lib/api-helpers";
import { parsePagination, paginatedResult } from "@/lib/pagination";
import { z } from "zod";

const createItemSchema = z.object({
  dealId: z.string().min(1),
  materialKey: z.string().min(1),
  category: z.string().min(1),
  isCustom: z.boolean().optional(),
  label: z.string().optional(),
  qty: z.number().optional(),
  unit: z.string().optional(),
  unitPrice: z.number().optional(),
});

const updateItemSchema = z.object({
  id: z.string().min(1),
  purchased: z.boolean().optional(),
  actualPrice: z.number().nullable().optional(),
  actualQty: z.number().nullable().optional(),
  vendor: z.string().nullable().optional(),
  purchasedDate: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  stylePreferences: z.record(z.string(), z.string()).nullable().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireOrgMember();
    const pagination = parsePagination(req);
    const dealId = req.nextUrl.searchParams.get("dealId");

    const where: Record<string, unknown> = { orgId: ctx.orgId };
    if (dealId) where.dealId = dealId;

    const total = await prisma.shoppingListItem.count({ where });
    const items = await prisma.shoppingListItem.findMany({
      where,
      orderBy: { category: "asc" },
      take: pagination.limit,
      skip: pagination.skip,
    });
    return apiSuccess(paginatedResult(items, total, pagination));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requirePermission("shopping:write");
    const body = await req.json();
    const data = createItemSchema.parse(body);

    const item = await prisma.shoppingListItem.create({
      data: {
        orgId: ctx.orgId,
        userId: ctx.userId,
        dealId: data.dealId,
        materialKey: data.materialKey,
        category: data.category,
        isCustom: data.isCustom || false,
        label: data.label,
        qty: data.qty,
        unit: data.unit,
        unitPrice: data.unitPrice,
      },
    });

    return apiSuccess(item, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const ctx = await requirePermission("shopping:write");
    const body = await req.json();
    const data = updateItemSchema.parse(body);

    const existing = await prisma.shoppingListItem.findFirst({ where: { id: data.id, orgId: ctx.orgId } });
    if (!existing) return apiError("Item not found", 404);

    const updateData: Record<string, unknown> = {};
    if (data.purchased !== undefined) updateData.purchased = data.purchased;
    if (data.actualPrice !== undefined) updateData.actualPrice = data.actualPrice;
    if (data.actualQty !== undefined) updateData.actualQty = data.actualQty;
    if (data.vendor !== undefined) updateData.vendor = data.vendor;
    if (data.purchasedDate !== undefined) updateData.purchasedDate = data.purchasedDate ? new Date(data.purchasedDate) : null;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.stylePreferences !== undefined) updateData.stylePreferences = data.stylePreferences;

    const item = await prisma.shoppingListItem.update({
      where: { id: data.id },
      data: updateData,
    });

    return apiSuccess(item);
  } catch (error) {
    return handleApiError(error);
  }
}
