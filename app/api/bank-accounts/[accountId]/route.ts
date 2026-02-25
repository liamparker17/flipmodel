import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { requireOrgMember, requirePermission, apiSuccess, apiError, handleApiError } from "@/lib/api-helpers";
import { updateBankAccountSchema } from "@/lib/validations/bank";
import { writeAuditLog } from "@/lib/audit";

type Params = { params: Promise<{ accountId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const ctx = await requireOrgMember();
    const { accountId } = await params;

    const account = await prisma.bankAccount.findFirst({
      where: { id: accountId, orgId: ctx.orgId },
      include: {
        transactions: {
          orderBy: { date: "desc" },
          take: 50,
        },
      },
    });

    if (!account) return apiError("Bank account not found", 404);

    return apiSuccess(account);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const ctx = await requirePermission("accounting:write");
    const { accountId } = await params;
    const body = await req.json();
    const data = updateBankAccountSchema.parse(body);

    const existing = await prisma.bankAccount.findFirst({
      where: { id: accountId, orgId: ctx.orgId },
    });
    if (!existing) return apiError("Bank account not found", 404);

    const account = await prisma.bankAccount.update({
      where: { id: accountId },
      data,
    });

    await writeAuditLog({
      orgId: ctx.orgId,
      userId: ctx.userId,
      action: "update",
      entityType: "BankAccount",
      entityId: account.id,
      metadata: { name: account.name },
    });

    return apiSuccess(account);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const ctx = await requirePermission("accounting:write");
    const { accountId } = await params;

    const existing = await prisma.bankAccount.findFirst({
      where: { id: accountId, orgId: ctx.orgId },
    });
    if (!existing) return apiError("Bank account not found", 404);

    const transactionCount = await prisma.bankTransaction.count({
      where: { bankAccountId: accountId },
    });
    if (transactionCount > 0) {
      return apiError("Cannot delete bank account with existing transactions", 400);
    }

    await prisma.bankAccount.delete({ where: { id: accountId } });

    await writeAuditLog({
      orgId: ctx.orgId,
      userId: ctx.userId,
      action: "delete",
      entityType: "BankAccount",
      entityId: accountId,
      metadata: { name: existing.name },
    });

    return apiSuccess({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
