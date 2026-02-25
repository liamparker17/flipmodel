import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { requirePermission, apiSuccess, apiError, handleApiError } from "@/lib/api-helpers";
import { reconcileTransactionSchema } from "@/lib/validations/bank";
import { writeAuditLog } from "@/lib/audit";

type Params = { params: Promise<{ accountId: string; transactionId: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const ctx = await requirePermission("accounting:write");
    const { accountId, transactionId } = await params;
    const body = await req.json();
    const data = reconcileTransactionSchema.parse(body);

    const transaction = await prisma.bankTransaction.findFirst({
      where: { id: transactionId, bankAccountId: accountId, orgId: ctx.orgId },
    });
    if (!transaction) return apiError("Bank transaction not found", 404);

    const updated = await prisma.bankTransaction.update({
      where: { id: transactionId },
      data: {
        isReconciled: true,
        reconciledAt: new Date(),
        matchedEntityType: data.matchedEntityType,
        matchedEntityId: data.matchedEntityId,
      },
    });

    await writeAuditLog({
      orgId: ctx.orgId,
      userId: ctx.userId,
      action: "reconcile",
      entityType: "BankTransaction",
      entityId: transactionId,
      metadata: {
        bankAccountId: accountId,
        matchedEntityType: data.matchedEntityType,
        matchedEntityId: data.matchedEntityId,
      },
    });

    return apiSuccess(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
