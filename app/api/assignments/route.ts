import { NextRequest } from "next/server";
import { requireOrgMember, apiSuccess, handleApiError } from "@/lib/api-helpers";
import { parsePagination, paginatedResult } from "@/lib/pagination";
import prisma from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireOrgMember();
    const memberId = ctx.member.id;
    const pagination = parsePagination(req);

    const milestoneWhere = {
      orgId: ctx.orgId,
      assignedToMemberId: memberId,
    };

    const taskWhere = {
      assignedTo: memberId,
      milestone: { orgId: ctx.orgId },
    };

    // Get milestones and tasks assigned to this member (paginated together)
    const [milestoneTotal, milestones, taskTotal, tasks] = await Promise.all([
      prisma.milestone.count({ where: milestoneWhere }),
      prisma.milestone.findMany({
        where: milestoneWhere,
        include: {
          tasks: true,
          deal: { select: { id: true, name: true, address: true } },
        },
        orderBy: { dueDate: "asc" },
        take: pagination.limit,
        skip: pagination.skip,
      }),
      prisma.task.count({ where: taskWhere }),
      prisma.task.findMany({
        where: taskWhere,
        include: {
          milestone: {
            select: {
              id: true,
              title: true,
              dealId: true,
              deal: { select: { id: true, name: true, address: true } },
            },
          },
        },
        orderBy: { dueDate: "asc" },
        take: pagination.limit,
        skip: pagination.skip,
      }),
    ]);

    return apiSuccess({
      milestones: paginatedResult(milestones, milestoneTotal, pagination),
      tasks: paginatedResult(tasks, taskTotal, pagination),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
