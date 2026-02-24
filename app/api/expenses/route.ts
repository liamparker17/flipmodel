import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { requireOrgMember, requirePermission, apiSuccess, apiError, handleApiError } from "@/lib/api-helpers";
import { createExpenseSchema } from "@/lib/validations/expense";

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireOrgMember();
    const dealId = req.nextUrl.searchParams.get("dealId");
    const signOffStatus = req.nextUrl.searchParams.get("signOffStatus");

    const where: Record<string, unknown> = { orgId: ctx.orgId };
    if (dealId) where.dealId = dealId;
    if (signOffStatus) where.signOffStatus = signOffStatus;

    const expenses = await prisma.expense.findMany({
      where,
      orderBy: { date: "desc" },
    });
    return apiSuccess(expenses);
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

    // ─── Budget Controls ───
    // Fetch the deal to get the budget (quickRenoEstimate from deal data)
    const deal = await prisma.deal.findFirst({
      where: { id: data.dealId, orgId: ctx.orgId },
    });

    if (!deal) return apiError("Deal not found", 404);

    let budgetWarning: string | undefined;

    const dealData = deal.data as { quickRenoEstimate?: number } | null;
    const budget = dealData?.quickRenoEstimate;

    if (budget && budget > 0) {
      // Sum all existing expenses for this deal (non-projected only)
      const existingExpenses = await prisma.expense.aggregate({
        where: { dealId: data.dealId, isProjected: false },
        _sum: { amount: true },
      });

      const totalExisting = existingExpenses._sum.amount ?? 0;
      const newTotal = totalExisting + data.amount;

      if (newTotal > budget * 1.2) {
        if (!force) {
          return apiError(
            `Budget exceeded by more than 20%. Total expenses (${newTotal.toFixed(2)}) would exceed budget (${budget.toFixed(2)}) by ${(((newTotal / budget) - 1) * 100).toFixed(1)}%. Use { "force": true } to override.`,
            400
          );
        }
        budgetWarning = `Budget exceeded by more than 20%. Total expenses: ${newTotal.toFixed(2)}, Budget: ${budget.toFixed(2)}. Override applied.`;
      } else if (newTotal > budget * 1.0) {
        budgetWarning = `Budget warning: Total expenses (${newTotal.toFixed(2)}) exceed budget (${budget.toFixed(2)}) by ${(((newTotal / budget) - 1) * 100).toFixed(1)}%.`;
      }
    }

    const expense = await prisma.expense.create({
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

    if (budgetWarning) {
      return apiSuccess({ ...expense, _budgetWarning: budgetWarning }, 201);
    }

    return apiSuccess(expense, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
