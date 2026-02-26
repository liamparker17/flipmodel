import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { requirePermission, apiSuccess, apiError, handleApiError } from "@/lib/api-helpers";
import { writeAuditLog } from "@/lib/audit";

type Params = { params: Promise<{ billId: string }> };

export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const ctx = await requirePermission("payables:write");
    const { billId } = await params;

    const existing = await prisma.vendorBill.findFirst({
      where: { id: billId, orgId: ctx.orgId },
    });

    if (!existing) return apiError("Vendor bill not found", 404);

    if (existing.status !== "draft") {
      return apiError(
        `Only draft bills can be approved. Current status: ${existing.status}`,
        400,
      );
    }

    const bill = await prisma.vendorBill.update({
      where: { id: billId },
      data: { status: "approved" },
      include: { lines: true },
    });

    await writeAuditLog({
      orgId: ctx.orgId,
      userId: ctx.userId,
      action: "approve",
      entityType: "VendorBill",
      entityId: billId,
      metadata: { billNumber: bill.billNumber },
    });

    return apiSuccess(bill);
  } catch (error) {
    return handleApiError(error);
  }
}
