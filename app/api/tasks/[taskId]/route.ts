import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { requireAuth, apiSuccess, apiError, handleApiError } from "@/lib/api-helpers";
import { z } from "zod";

type Params = { params: Promise<{ taskId: string }> };

const updateTaskSchema = z.object({
  title: z.string().optional(),
  completed: z.boolean().optional(),
  assignedTo: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
});

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    await requireAuth();
    const { taskId } = await params;
    const body = await req.json();
    const data = updateTaskSchema.parse(body);

    const existing = await prisma.task.findUnique({ where: { id: taskId } });
    if (!existing) return apiError("Task not found", 404);

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
