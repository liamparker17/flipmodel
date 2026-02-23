import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { requirePermission, apiSuccess, apiError, handleApiError } from "@/lib/api-helpers";
import { z } from "zod";

const createTaskSchema = z.object({
  milestoneId: z.string().min(1),
  title: z.string().min(1),
  assignedTo: z.string().optional(),
  dueDate: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const ctx = await requirePermission("tasks:write");
    const body = await req.json();
    const data = createTaskSchema.parse(body);

    // Verify milestone belongs to user's org
    const milestone = await prisma.milestone.findFirst({
      where: { id: data.milestoneId, orgId: ctx.orgId },
    });
    if (!milestone) return apiError("Milestone not found", 404);

    const task = await prisma.task.create({
      data: {
        milestoneId: data.milestoneId,
        title: data.title,
        assignedTo: data.assignedTo,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
      },
    });

    return apiSuccess(task, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
