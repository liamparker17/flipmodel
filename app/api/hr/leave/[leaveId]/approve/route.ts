import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { requirePermission, apiSuccess, apiError, handleApiError } from "@/lib/api-helpers";
import { writeAuditLog } from "@/lib/audit";

type Params = { params: Promise<{ leaveId: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const ctx = await requirePermission("team:manage");
    const { leaveId } = await params;
    const body = await req.json();
    const { action } = body as { action: "approve" | "reject" };

    if (action !== "approve" && action !== "reject") {
      return apiError("Action must be 'approve' or 'reject'", 400);
    }

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
