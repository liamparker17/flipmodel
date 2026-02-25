import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { requireOrgMember, requirePermission, apiSuccess, handleApiError } from "@/lib/api-helpers";
import { parsePagination, paginatedResult } from "@/lib/pagination";
import { createBankAccountSchema } from "@/lib/validations/bank";
import { writeAuditLog } from "@/lib/audit";

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireOrgMember();
    const pagination = parsePagination(req);
    const isActive = req.nextUrl.searchParams.get("isActive");

    const where: Record<string, unknown> = { orgId: ctx.orgId };
    if (isActive !== null) where.isActive = isActive === "true";

    const [accounts, total] = await Promise.all([
      prisma.bankAccount.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: pagination.skip,
        take: pagination.limit,
      }),
      prisma.bankAccount.count({ where }),
    ]);

    return apiSuccess(paginatedResult(accounts, total, pagination));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requirePermission("accounting:write");
    const body = await req.json();
    const data = createBankAccountSchema.parse(body);

    const account = await prisma.bankAccount.create({
      data: {
        orgId: ctx.orgId,
        name: data.name,
        bankName: data.bankName,
        accountNumber: data.accountNumber,
        branchCode: data.branchCode,
        accountType: data.accountType ?? "cheque",
        currency: data.currency ?? "ZAR",
        currentBalance: data.currentBalance ?? 0,
        accountCode: data.accountCode,
      },
    });

    await writeAuditLog({
      orgId: ctx.orgId,
      userId: ctx.userId,
      action: "create",
      entityType: "BankAccount",
      entityId: account.id,
      metadata: { name: data.name },
    });

    return apiSuccess(account, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
