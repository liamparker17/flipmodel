import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { requireOrgMember, requirePermission, apiSuccess, handleApiError } from "@/lib/api-helpers";
import { parsePagination, paginatedResult } from "@/lib/pagination";
import { createMilestoneSchema } from "@/lib/validations/milestone";

export async function GET(req: NextRequest) {
  try {
    const ctx = await requirePermission("milestones:read");
    const pagination = parsePagination(req);
    const dealId = req.nextUrl.searchParams.get("dealId");

    const where: Record<string, unknown> = { orgId: ctx.orgId };
    if (dealId) where.dealId = dealId;

    const total = await prisma.milestone.count({ where });
    const milestones = await prisma.milestone.findMany({
      where,
      include: { tasks: true },
      orderBy: { order: "asc" },
      take: pagination.limit,
      skip: pagination.skip,
    });
    return apiSuccess(paginatedResult(milestones, total, pagination));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requirePermission("milestones:write");
    const body = await req.json();
    const data = createMilestoneSchema.parse(body);

    const milestone = await prisma.milestone.create({
      data: {
        orgId: ctx.orgId,
        userId: ctx.userId,
        dealId: data.dealId,
        title: data.title,
        description: data.description || "",
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        status: data.status || "pending",
        order: data.order || 0,
        assignedContractorId: data.assignedContractorId,
        assignedToMemberId: data.assignedToMemberId,
        roomId: data.roomId,
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
