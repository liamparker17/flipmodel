import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { requirePermission, apiSuccess, apiError, handleApiError } from "@/lib/api-helpers";
import { writeAuditLog } from "@/lib/audit";

type Params = { params: Promise<{ periodId: string }> };

export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const ctx = await requirePermission("accounting:write");
    const { periodId } = await params;

    const period = await prisma.financialPeriod.findFirst({
      where: { id: periodId, orgId: ctx.orgId },
    });
    if (!period) return apiError("Financial period not found", 404);

    if (period.status !== "open") {
      return apiError("Only open periods can be closed", 400);
    }

    const updated = await prisma.financialPeriod.update({
      where: { id: periodId },
      data: {
        status: "closed",
        closedBy: ctx.userId,
        closedAt: new Date(),
      },
    });

    await writeAuditLog({
      orgId: ctx.orgId,
      userId: ctx.userId,
      action: "update",
      entityType: "financial_period",
      entityId: periodId,
      metadata: { action: "close", name: period.name },
    });

    return apiSuccess(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
