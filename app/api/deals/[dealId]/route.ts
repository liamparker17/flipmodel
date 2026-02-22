import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { requireAuth, apiSuccess, apiError, handleApiError } from "@/lib/api-helpers";
import { updateDealSchema } from "@/lib/validations/deal";

type Params = { params: Promise<{ dealId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const userId = await requireAuth();
    const { dealId } = await params;

    const deal = await prisma.deal.findFirst({
      where: { id: dealId, userId },
      include: {
        expenses: true,
        milestones: { include: { tasks: true }, orderBy: { order: "asc" } },
        activities: { orderBy: { timestamp: "desc" } },
        dealContacts: { include: { contact: true } },
        documents: true,
        shoppingListItems: true,
      },
    });

    if (!deal) return apiError("Deal not found", 404);
    return apiSuccess(deal);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const userId = await requireAuth();
    const { dealId } = await params;
    const body = await req.json();
    const data = updateDealSchema.parse(body);

    const existing = await prisma.deal.findFirst({ where: { id: dealId, userId } });
    if (!existing) return apiError("Deal not found", 404);

    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.purchasePrice !== undefined) updateData.purchasePrice = data.purchasePrice;
    if (data.expectedSalePrice !== undefined) updateData.expectedSalePrice = data.expectedSalePrice;
    if (data.actualSalePrice !== undefined) updateData.actualSalePrice = data.actualSalePrice;
    if (data.stage !== undefined) updateData.stage = data.stage;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.tags !== undefined) updateData.tags = data.tags;
    if (data.data !== undefined) updateData.data = data.data;
    if (data.offerAmount !== undefined) updateData.offerAmount = data.offerAmount;
    if (data.offerDate !== undefined) updateData.offerDate = data.offerDate ? new Date(data.offerDate) : null;
    if (data.purchaseDate !== undefined) updateData.purchaseDate = data.purchaseDate ? new Date(data.purchaseDate) : null;
    if (data.transferDate !== undefined) updateData.transferDate = data.transferDate ? new Date(data.transferDate) : null;
    if (data.listedDate !== undefined) updateData.listedDate = data.listedDate ? new Date(data.listedDate) : null;
    if (data.soldDate !== undefined) updateData.soldDate = data.soldDate ? new Date(data.soldDate) : null;
    if (data.actualSaleDate !== undefined) updateData.actualSaleDate = data.actualSaleDate ? new Date(data.actualSaleDate) : null;

    const deal = await prisma.deal.update({
      where: { id: dealId },
      data: updateData,
      include: {
        expenses: true,
        milestones: { include: { tasks: true } },
        activities: { orderBy: { timestamp: "desc" } },
        dealContacts: { include: { contact: true } },
        documents: true,
        shoppingListItems: true,
      },
    });

    return apiSuccess(deal);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const userId = await requireAuth();
    const { dealId } = await params;

    const existing = await prisma.deal.findFirst({ where: { id: dealId, userId } });
    if (!existing) return apiError("Deal not found", 404);

    await prisma.deal.delete({ where: { id: dealId } });
    return apiSuccess({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
