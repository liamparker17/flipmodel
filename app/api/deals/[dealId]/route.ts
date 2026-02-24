import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { requireOrgMember, requirePermission, apiSuccess, apiError, handleApiError } from "@/lib/api-helpers";
import { updateDealSchema } from "@/lib/validations/deal";
import { validateStageTransition } from "@/utils/stageValidation";

type Params = { params: Promise<{ dealId: string }> };

interface DealLike {
  purchasePrice: number;
  purchaseDate: Date | null;
  expectedSalePrice: number;
  actualSalePrice: number | null;
  soldDate: Date | null;
  actualSaleDate: Date | null;
}

interface DealUpdate {
  purchasePrice?: number;
  purchaseDate?: Date | null;
  expectedSalePrice?: number;
  actualSalePrice?: number | null;
  soldDate?: Date | null;
  actualSaleDate?: Date | null;
}

function validateStagePrerequisites(
  newStage: string,
  existing: DealLike,
  update: DealUpdate
): string | null {
  // Merge existing values with the incoming update to check "being set in the same update"
  const purchasePrice = update.purchasePrice !== undefined ? update.purchasePrice : existing.purchasePrice;
  const purchaseDate = update.purchaseDate !== undefined ? update.purchaseDate : existing.purchaseDate;
  const expectedSalePrice = update.expectedSalePrice !== undefined ? update.expectedSalePrice : existing.expectedSalePrice;
  const actualSalePrice = update.actualSalePrice !== undefined ? update.actualSalePrice : existing.actualSalePrice;
  const soldDate = update.soldDate !== undefined ? update.soldDate : existing.soldDate;
  const actualSaleDate = update.actualSaleDate !== undefined ? update.actualSaleDate : existing.actualSaleDate;

  if (newStage === "purchased") {
    const errors: string[] = [];
    if (!purchasePrice || purchasePrice <= 0) {
      errors.push("purchase price is required");
    }
    if (!purchaseDate) {
      errors.push("purchase date is required");
    }
    if (errors.length > 0) {
      return `Cannot move to 'purchased': ${errors.join(", ")}`;
    }
  }

  if (newStage === "listed") {
    if (!expectedSalePrice || expectedSalePrice <= 0) {
      return "Cannot move to 'listed': expected sale price is required";
    }
  }

  if (newStage === "sold") {
    const errors: string[] = [];
    if (!actualSalePrice || actualSalePrice <= 0) {
      errors.push("actual sale price is required");
    }
    if (!soldDate && !actualSaleDate) {
      errors.push("sold date or actual sale date is required");
    }
    if (errors.length > 0) {
      return `Cannot move to 'sold': ${errors.join(", ")}`;
    }
  }

  return null;
}

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const ctx = await requireOrgMember();
    const { dealId } = await params;

    const deal = await prisma.deal.findFirst({
      where: { id: dealId, orgId: ctx.orgId },
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
    const ctx = await requirePermission("deals:write");
    const { dealId } = await params;
    const body = await req.json();
    const data = updateDealSchema.parse(body);

    const existing = await prisma.deal.findFirst({ where: { id: dealId, orgId: ctx.orgId } });
    if (!existing) return apiError("Deal not found", 404);

    // Validate stage transition if stage is being changed
    if (data.stage !== undefined && data.stage !== existing.stage) {
      const transitionError = validateStageTransition(existing.stage, data.stage);
      if (transitionError) return apiError(transitionError, 400);

      // Build the pending update values to check prerequisites against
      const pendingUpdate: DealUpdate = {};
      if (data.purchasePrice !== undefined) pendingUpdate.purchasePrice = data.purchasePrice;
      if (data.purchaseDate !== undefined) pendingUpdate.purchaseDate = data.purchaseDate ? new Date(data.purchaseDate) : null;
      if (data.expectedSalePrice !== undefined) pendingUpdate.expectedSalePrice = data.expectedSalePrice;
      if (data.actualSalePrice !== undefined) pendingUpdate.actualSalePrice = data.actualSalePrice;
      if (data.soldDate !== undefined) pendingUpdate.soldDate = data.soldDate ? new Date(data.soldDate) : null;
      if (data.actualSaleDate !== undefined) pendingUpdate.actualSaleDate = data.actualSaleDate ? new Date(data.actualSaleDate) : null;

      const prerequisiteError = validateStagePrerequisites(data.stage, existing, pendingUpdate);
      if (prerequisiteError) return apiError(prerequisiteError, 400);
    }

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
    const ctx = await requirePermission("deals:delete");
    const { dealId } = await params;

    const existing = await prisma.deal.findFirst({ where: { id: dealId, orgId: ctx.orgId } });
    if (!existing) return apiError("Deal not found", 404);

    await prisma.deal.delete({ where: { id: dealId } });
    return apiSuccess({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
