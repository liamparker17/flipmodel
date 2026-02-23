import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { requirePermission, apiSuccess, apiError, handleApiError } from "@/lib/api-helpers";
import { z } from "zod";

type Params = { params: Promise<{ milestoneId: string }> };

const updateMilestoneSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  dueDate: z.string().nullable().optional(),
  completedDate: z.string().nullable().optional(),
  status: z.string().optional(),
  order: z.number().int().optional(),
  assignedContractorId: z.string().nullable().optional(),
  assignedToMemberId: z.string().nullable().optional(),
  roomId: z.string().nullable().optional(),
  inspectionStatus: z.string().nullable().optional(),
  inspectionNotes: z.string().nullable().optional(),
});

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const ctx = await requirePermission("milestones:write");
    const { milestoneId } = await params;
    const body = await req.json();
    const data = updateMilestoneSchema.parse(body);

    const existing = await prisma.milestone.findFirst({ where: { id: milestoneId, orgId: ctx.orgId } });
    if (!existing) return apiError("Milestone not found", 404);

    const updateData: Record<string, unknown> = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.dueDate !== undefined) updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
    if (data.completedDate !== undefined) updateData.completedDate = data.completedDate ? new Date(data.completedDate) : null;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.order !== undefined) updateData.order = data.order;
    if (data.assignedContractorId !== undefined) updateData.assignedContractorId = data.assignedContractorId;
    if (data.assignedToMemberId !== undefined) updateData.assignedToMemberId = data.assignedToMemberId;
    if (data.roomId !== undefined) updateData.roomId = data.roomId;
    if (data.inspectionStatus !== undefined) {
      updateData.inspectionStatus = data.inspectionStatus;
      updateData.inspectedAt = new Date();
    }
    if (data.inspectionNotes !== undefined) updateData.inspectionNotes = data.inspectionNotes;

    const milestone = await prisma.milestone.update({
      where: { id: milestoneId },
      data: updateData,
      include: { tasks: true },
    });

    return apiSuccess(milestone);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const ctx = await requirePermission("milestones:write");
    const { milestoneId } = await params;

    const existing = await prisma.milestone.findFirst({ where: { id: milestoneId, orgId: ctx.orgId } });
    if (!existing) return apiError("Milestone not found", 404);

    await prisma.milestone.delete({ where: { id: milestoneId } });
    return apiSuccess({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
