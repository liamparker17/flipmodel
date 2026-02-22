import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { requireAuth, apiSuccess, apiError, handleApiError } from "@/lib/api-helpers";
import { updateToolSchema, checkoutToolSchema, returnToolSchema } from "@/lib/validations/tool";

type Params = { params: Promise<{ toolId: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const userId = await requireAuth();
    const { toolId } = await params;
    const body = await req.json();

    // Handle special actions
    if (body._action === "checkout") {
      return handleCheckout(userId, toolId, body);
    }
    if (body._action === "return") {
      return handleReturn(userId, body);
    }
    if (body._action === "maintenance") {
      return handleMaintenance(userId, toolId, body);
    }
    if (body._action === "incident") {
      return handleIncident(userId, toolId, body);
    }
    if (body._action === "resolveIncident") {
      return handleResolveIncident(userId, body);
    }

    const data = updateToolSchema.parse(body);
    const existing = await prisma.tool.findFirst({ where: { id: toolId, userId } });
    if (!existing) return apiError("Tool not found", 404);

    const tool = await prisma.tool.update({
      where: { id: toolId },
      data: {
        ...data,
        purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : undefined,
      },
    });

    return apiSuccess(tool);
  } catch (error) {
    return handleApiError(error);
  }
}

async function handleCheckout(userId: string, toolId: string, body: Record<string, unknown>) {
  const data = checkoutToolSchema.parse(body);
  const tool = await prisma.tool.findFirst({ where: { id: toolId, userId } });
  if (!tool) return apiError("Tool not found", 404);

  await prisma.toolCheckout.create({
    data: {
      userId,
      toolId,
      contractorName: data.contractorName,
      contractorId: data.contractorId,
      dealId: data.dealId,
      dealName: data.dealName,
      propertyAddress: data.propertyAddress,
      expectedReturnDate: data.expectedReturnDate ? new Date(data.expectedReturnDate) : null,
      conditionOut: tool.condition,
      notes: data.notes,
    },
  });

  const updated = await prisma.tool.update({
    where: { id: toolId },
    data: {
      status: "checked_out",
      currentHolderType: "contractor",
      currentHolderName: data.contractorName,
      currentHolderId: data.contractorId,
      currentDealId: data.dealId,
      currentDealName: data.dealName,
    },
  });

  return apiSuccess(updated);
}

async function handleReturn(userId: string, body: Record<string, unknown>) {
  const data = returnToolSchema.parse(body);
  const checkout = await prisma.toolCheckout.findFirst({
    where: { id: data.checkoutId, userId },
  });
  if (!checkout) return apiError("Checkout not found", 404);

  await prisma.toolCheckout.update({
    where: { id: data.checkoutId },
    data: {
      returnedAt: new Date(),
      conditionIn: data.conditionIn,
      notes: data.notes,
    },
  });

  const updated = await prisma.tool.update({
    where: { id: checkout.toolId },
    data: {
      status: "available",
      condition: data.conditionIn,
      currentHolderType: null,
      currentHolderName: null,
      currentHolderId: null,
      currentDealId: null,
      currentDealName: null,
    },
  });

  return apiSuccess(updated);
}

async function handleMaintenance(userId: string, toolId: string, body: Record<string, unknown>) {
  const entry = await prisma.toolMaintenance.create({
    data: {
      userId,
      toolId,
      date: new Date(body.date as string),
      type: body.type as string,
      description: body.description as string,
      cost: body.cost as number | undefined,
      performedBy: body.performedBy as string | undefined,
      notes: body.notes as string | undefined,
    },
  });
  return apiSuccess(entry, 201);
}

async function handleIncident(userId: string, toolId: string, body: Record<string, unknown>) {
  const incident = await prisma.toolIncident.create({
    data: {
      userId,
      toolId,
      date: new Date(body.date as string),
      type: body.type as string,
      contractorName: body.contractorName as string,
      contractorId: body.contractorId as string | undefined,
      dealId: body.dealId as string | undefined,
      dealName: body.dealName as string | undefined,
      description: body.description as string,
      estimatedCost: body.estimatedCost as number | undefined,
      notes: body.notes as string | undefined,
    },
  });

  const newStatus = body.type === "lost" || body.type === "stolen" ? "lost" : "damaged";
  await prisma.tool.update({
    where: { id: toolId },
    data: {
      status: newStatus,
      condition: body.type === "broken" ? "broken" : undefined,
    },
  });

  return apiSuccess(incident, 201);
}

async function handleResolveIncident(userId: string, body: Record<string, unknown>) {
  const incident = await prisma.toolIncident.findFirst({
    where: { id: body.incidentId as string, userId },
  });
  if (!incident) return apiError("Incident not found", 404);

  const updated = await prisma.toolIncident.update({
    where: { id: body.incidentId as string },
    data: {
      recoveryStatus: body.recoveryStatus as string,
      recoveryAmount: body.recoveryAmount as number | undefined,
      notes: body.notes as string | undefined,
    },
  });

  return apiSuccess(updated);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const userId = await requireAuth();
    const { toolId } = await params;

    const existing = await prisma.tool.findFirst({ where: { id: toolId, userId } });
    if (!existing) return apiError("Tool not found", 404);

    await prisma.tool.delete({ where: { id: toolId } });
    return apiSuccess({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
