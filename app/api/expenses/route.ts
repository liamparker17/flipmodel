import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { requireOrgMember, requirePermission, apiSuccess, apiError, handleApiError, NotFoundError, ValidationError, BudgetExceededError } from "@/lib/api-helpers";
import { parsePagination, paginatedResult } from "@/lib/pagination";
import { createExpenseSchema } from "@/lib/validations/expense";
import { BUDGET_HARD_LIMIT_MULTIPLIER, BUDGET_WARNING_MULTIPLIER } from "@/lib/constants";
import { withFinancialTransaction } from "@/lib/financial-transaction";

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireOrgMember();
    const dealId = req.nextUrl.searchParams.get("dealId");
    const signOffStatus = req.nextUrl.searchParams.get("signOffStatus");

    const pagination = parsePagination(req);
    const where: Record<string, unknown> = { orgId: ctx.orgId };
    if (dealId) where.dealId = dealId;
    if (signOffStatus) where.signOffStatus = signOffStatus;

    const total = await prisma.expense.count({ where });
    const expenses = await prisma.expense.findMany({
      where,
      orderBy: { date: "desc" },
      take: pagination.limit,
      skip: pagination.skip,
    });
    return apiSuccess(paginatedResult(expenses, total, pagination));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requirePermission("expenses:write");
    const body = await req.json();
    const data = createExpenseSchema.parse(body);
    const force = (body as { force?: boolean }).force === true;

    const result = await withFinancialTransaction({
      tx: async (tx) => {
        // Read deal inside transaction to serialize concurrent expense creation
        const deal = await tx.deal.findFirst({
          where: { id: data.dealId, orgId: ctx.orgId },
        });

        if (!deal) throw new NotFoundError("Deal not found");

        let budgetWarning: string | undefined;
        const dealData = deal.data as { quickRenoEstimate?: number } | null;
        const budget = dealData?.quickRenoEstimate;

        if (budget && budget > 0) {
          // Aggregate inside serializable tx prevents phantom reads
          const existingExpenses = await tx.expense.aggregate({
            where: { dealId: data.dealId, isProjected: false },
            _sum: { amount: true },
          });

          const totalExisting = existingExpenses._sum.amount ?? 0;
          const newTotal = totalExisting + data.amount;

          if (newTotal > budget * BUDGET_HARD_LIMIT_MULTIPLIER) {
            if (!force) {
              throw new BudgetExceededError(
                newTotal,
                budget,
              );
            }
            budgetWarning = `Budget hard limit override applied. Total: ${newTotal.toFixed(2)}, Budget: ${budget.toFixed(2)}.`;
          } else if (newTotal > budget * BUDGET_WARNING_MULTIPLIER) {
            budgetWarning = `Budget warning: Total expenses (${newTotal.toFixed(2)}) exceed budget (${budget.toFixed(2)}).`;
          }
        }

        const expense = await tx.expense.create({
          data: {
            orgId: ctx.orgId,
            userId: ctx.userId,
            dealId: data.dealId,
            category: data.category,
            description: data.description,
            amount: data.amount,
            date: new Date(data.date),
            vendor: data.vendor || "",
            paymentMethod: data.paymentMethod || "eft",
            receiptRef: data.receiptRef,
            notes: data.notes,
            isProjected: data.isProjected || false,
            milestoneId: data.milestoneId,
            contractorId: data.contractorId,
          },
        });

        return { expense, budgetWarning };
      },
      audit: (result) => ({
        orgId: ctx.orgId,
        userId: ctx.userId,
        action: "create",
        entityType: "Expense",
        entityId: result.expense.id,
        metadata: result.budgetWarning ? { budgetWarning: result.budgetWarning } : undefined,
      }),
      isolationLevel: "Serializable",
    });

    if (result.budgetWarning) {
      return apiSuccess({ ...result.expense, _budgetWarning: result.budgetWarning }, 201);
    }

    return apiSuccess(result.expense, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
