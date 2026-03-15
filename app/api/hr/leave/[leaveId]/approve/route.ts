import { NextRequest } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { requirePermission, apiSuccess, apiError, handleApiError } from "@/lib/api-helpers";
import { writeAuditLog } from "@/lib/audit";

const approveLeaveSchema = z.object({
  action: z.enum(["approve", "reject"], {
    error: "Action must be 'approve' or 'reject'",
  }),
});

type Params = { params: Promise<{ leaveId: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const ctx = await requirePermission("team:manage");
    const { leaveId } = await params;
    const body = await req.json();
    const { action } = approveLeaveSchema.parse(body);

    const existing = await prisma.leaveRecord.findFirst({
      where: { id: leaveId, orgId: ctx.orgId },
    });
    if (!existing) return apiError("Leave record not found", 404);
    if (existing.status !== "pending") {
      return apiError("Leave request is not pending", 400);
    }

    const record = await prisma.leaveRecord.update({
      where: { id: leaveId },
      data: {
        status: action === "approve" ? "approved" : "rejected",
        approvedBy: ctx.userId,
        approvedAt: new Date(),
      },
    });

    await writeAuditLog({
      orgId: ctx.orgId,
      userId: ctx.userId,
      action: action,
      entityType: "leave_record",
      entityId: leaveId,
    });

    return apiSuccess(record);
  } catch (error) {
    return handleApiError(error);
  }
}
