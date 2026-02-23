import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { requirePermission, apiSuccess, apiError, handleApiError } from "@/lib/api-helpers";
import { updateExpenseSchema } from "@/lib/validations/expense";

type Params = { params: Promise<{ expenseId: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const ctx = await requirePermission("expenses:write");
    const { expenseId } = await params;
    const body = await req.json();
    const data = updateExpenseSchema.parse(body);

    const existing = await prisma.expense.findFirst({ where: { id: expenseId, orgId: ctx.orgId } });
    if (!existing) return apiError("Expense not found", 404);

    const updateData: Record<string, unknown> = {};
    if (data.category !== undefined) updateData.category = data.category;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.amount !== undefined) updateData.amount = data.amount;
    if (data.date !== undefined) updateData.date = new Date(data.date);
    if (data.vendor !== undefined) updateData.vendor = data.vendor;
    if (data.paymentMethod !== undefined) updateData.paymentMethod = data.paymentMethod;
    if (data.receiptRef !== undefined) updateData.receiptRef = data.receiptRef;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.isProjected !== undefined) updateData.isProjected = data.isProjected;
    if (data.milestoneId !== undefined) updateData.milestoneId = data.milestoneId;
    if (data.contractorId !== undefined) updateData.contractorId = data.contractorId;
    if (data.signOffStatus !== undefined) {
      updateData.signOffStatus = data.signOffStatus;
      if (data.signOffStatus === "approved") updateData.signOffApprovedAt = new Date();
    }
    if (data.signOffPmNotes !== undefined) updateData.signOffPmNotes = data.signOffPmNotes;

    const expense = await prisma.expense.update({
      where: { id: expenseId },
      data: updateData,
    });

    return apiSuccess(expense);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const ctx = await requirePermission("expenses:write");
    const { expenseId } = await params;

    const existing = await prisma.expense.findFirst({ where: { id: expenseId, orgId: ctx.orgId } });
    if (!existing) return apiError("Expense not found", 404);

    await prisma.expense.delete({ where: { id: expenseId } });
    return apiSuccess({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
