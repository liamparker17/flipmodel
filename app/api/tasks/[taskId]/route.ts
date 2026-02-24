import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { requirePermission, apiSuccess, apiError, handleApiError } from "@/lib/api-helpers";
import { z } from "zod";

type Params = { params: Promise<{ taskId: string }> };

const updateTaskSchema = z.object({
  title: z.string().optional(),
  completed: z.boolean().optional(),
  assignedTo: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
});

/**
 * Verify the task belongs to the caller's org by traversing
 * task -> milestone -> deal -> orgId.
 */
async function verifyTaskOrgOwnership(taskId: string, orgId: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      milestone: {
        include: {
          deal: { select: { orgId: true } },
        },
      },
    },
  });

  if (!task) return { found: false as const };

  const taskOrgId = task.milestone?.deal?.orgId;
  if (taskOrgId !== orgId) {
    return { found: true as const, authorized: false as const };
  }

  return { found: true as const, authorized: true as const, task };
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const ctx = await requirePermission("tasks:write");
    const { taskId } = await params;
    const body = await req.json();
    const data = updateTaskSchema.parse(body);

    // Verify task belongs to the user's organisation
    const ownership = await verifyTaskOrgOwnership(taskId, ctx.orgId);
    if (!ownership.found) return apiError("Task not found", 404);
    if (!ownership.authorized) return apiError("Task not found", 404);

    const updateData: Record<string, unknown> = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.completed !== undefined) {
      updateData.completed = data.completed;
      updateData.completedAt = data.completed ? new Date() : null;
    }
    if (data.assignedTo !== undefined) updateData.assignedTo = data.assignedTo;
    if (data.dueDate !== undefined) updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;

    const task = await prisma.task.update({
      where: { id: taskId },
      data: updateData,
    });

    return apiSuccess(task);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const ctx = await requirePermission("tasks:write");
    const { taskId } = await params;

    // Verify task belongs to the user's organisation
    const ownership = await verifyTaskOrgOwnership(taskId, ctx.orgId);
    if (!ownership.found) return apiError("Task not found", 404);
    if (!ownership.authorized) return apiError("Task not found", 404);

    await prisma.task.delete({ where: { id: taskId } });

    return apiSuccess({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
