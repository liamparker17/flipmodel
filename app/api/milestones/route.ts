import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { requireAuth, apiSuccess, handleApiError } from "@/lib/api-helpers";
import { z } from "zod";

const createMilestoneSchema = z.object({
  dealId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  dueDate: z.string().optional(),
  status: z.string().optional(),
  order: z.number().int().optional(),
  assignedContractorId: z.string().optional(),
  tasks: z.array(z.object({
    title: z.string().min(1),
    assignedTo: z.string().optional(),
    dueDate: z.string().optional(),
  })).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const userId = await requireAuth();
    const dealId = req.nextUrl.searchParams.get("dealId");

    const where: Record<string, unknown> = { userId };
    if (dealId) where.dealId = dealId;

    const milestones = await prisma.milestone.findMany({
      where,
      include: { tasks: true },
      orderBy: { order: "asc" },
    });
    return apiSuccess(milestones);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await requireAuth();
    const body = await req.json();
    const data = createMilestoneSchema.parse(body);

    const milestone = await prisma.milestone.create({
      data: {
        userId,
        dealId: data.dealId,
        title: data.title,
        description: data.description || "",
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        status: data.status || "pending",
        order: data.order || 0,
        assignedContractorId: data.assignedContractorId,
        tasks: data.tasks
          ? {
              create: data.tasks.map((t) => ({
                title: t.title,
                assignedTo: t.assignedTo,
                dueDate: t.dueDate ? new Date(t.dueDate) : null,
              })),
            }
          : undefined,
      },
      include: { tasks: true },
    });

    return apiSuccess(milestone, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
