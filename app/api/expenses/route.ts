import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { requireOrgMember, requirePermission, apiSuccess, handleApiError } from "@/lib/api-helpers";
import { createExpenseSchema } from "@/lib/validations/expense";

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireOrgMember();
    const dealId = req.nextUrl.searchParams.get("dealId");

    const where: Record<string, unknown> = { orgId: ctx.orgId };
    if (dealId) where.dealId = dealId;

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

    return apiSuccess(expense, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
