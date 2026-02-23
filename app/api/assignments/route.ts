import { requireOrgMember, apiSuccess, handleApiError } from "@/lib/api-helpers";
import prisma from "@/lib/db";

export async function GET() {
  try {
    const ctx = await requireOrgMember();
    const memberId = ctx.member.id;

    // Get milestones assigned to this member
    const milestones = await prisma.milestone.findMany({
      where: {
        orgId: ctx.orgId,
        assignedToMemberId: memberId,
      },
      include: {
        tasks: true,
        deal: { select: { id: true, name: true, address: true } },
      },
      orderBy: { dueDate: "asc" },
    });

    // Get tasks assigned to this member (across all milestones in the org)
    const tasks = await prisma.task.findMany({
      where: {
        assignedTo: memberId,
        milestone: { orgId: ctx.orgId },
      },
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
    });

    return apiSuccess({ milestones, tasks });
  } catch (error) {
    return handleApiError(error);
  }
}
