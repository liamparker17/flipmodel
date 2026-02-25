import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { requireOrgMember, requirePermission, apiSuccess, apiError, handleApiError } from "@/lib/api-helpers";
import { parsePagination, paginatedResult } from "@/lib/pagination";
import { createBankTransactionSchema } from "@/lib/validations/bank";
import { writeAuditLog } from "@/lib/audit";

type Params = { params: Promise<{ accountId: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const ctx = await requireOrgMember();
    const { accountId } = await params;
    const pagination = parsePagination(req);
    const isReconciled = req.nextUrl.searchParams.get("isReconciled");
    const startDate = req.nextUrl.searchParams.get("startDate");
    const endDate = req.nextUrl.searchParams.get("endDate");

    // Verify the bank account belongs to this org
    const account = await prisma.bankAccount.findFirst({
      where: { id: accountId, orgId: ctx.orgId },
    });
    if (!account) return apiError("Bank account not found", 404);

    const where: Record<string, unknown> = {
      orgId: ctx.orgId,
      bankAccountId: accountId,
    };
    if (isReconciled !== null) where.isReconciled = isReconciled === "true";
    if (startDate || endDate) {
      where.date = {
        ...(startDate ? { gte: new Date(startDate) } : {}),
        ...(endDate ? { lte: new Date(endDate) } : {}),
      };
    }

    const [transactions, total] = await Promise.all([
      prisma.bankTransaction.findMany({
        where,
        orderBy: { date: "desc" },
        skip: pagination.skip,
        take: pagination.limit,
      }),
      prisma.bankTransaction.count({ where }),
    ]);

    return apiSuccess(paginatedResult(transactions, total, pagination));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const ctx = await requirePermission("accounting:write");
    const { accountId } = await params;
    const body = await req.json();
    const data = createBankTransactionSchema.parse(body);

    // Verify the bank account belongs to this org
    const account = await prisma.bankAccount.findFirst({
      where: { id: accountId, orgId: ctx.orgId },
    });
    if (!account) return apiError("Bank account not found", 404);

    const transaction = await prisma.bankTransaction.create({
      data: {
        orgId: ctx.orgId,
        bankAccountId: accountId,
        date: new Date(data.date),
        description: data.description,
        amount: data.amount,
        reference: data.reference,
        type: data.type ?? "other",
        category: data.category,
      },
    });

    await writeAuditLog({
      orgId: ctx.orgId,
      userId: ctx.userId,
      action: "create",
      entityType: "BankTransaction",
      entityId: transaction.id,
      metadata: { bankAccountId: accountId, amount: data.amount },
    });

    return apiSuccess(transaction, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
