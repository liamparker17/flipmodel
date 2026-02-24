import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { requirePermission, apiSuccess, apiError, handleApiError } from "@/lib/api-helpers";
import { updateExpenseSchema } from "@/lib/validations/expense";
import { ORG_ROLE_LEVELS } from "@/types/org";
import type { OrgRole } from "@/types/org";

type Params = { params: Promise<{ expenseId: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const ctx = await requirePermission("expenses:write");
    const { expenseId } = await params;
    const body = await req.json();

    const existing = await prisma.expense.findFirst({ where: { id: expenseId, orgId: ctx.orgId } });
    if (!existing) return apiError("Expense not found", 404);

    // ─── Approval / Rejection Action ───
    const { action } = body as { action?: string };
    if (action === "approve" || action === "reject") {
      // Require project_manager or higher role
      const memberRole = ctx.member.role as OrgRole;
      const memberLevel = ORG_ROLE_LEVELS[memberRole] ?? 0;
      const requiredLevel = ORG_ROLE_LEVELS["project_manager"];

      if (memberLevel < requiredLevel) {
        return apiError(
          "Insufficient role: project_manager or higher is required to approve/reject expenses",
          403
        );
      }

      const updateData: Record<string, unknown> = {
        signOffStatus: action === "approve" ? "approved" : "rejected",
        signOffPmNotes: (body as { notes?: string }).notes ?? null,
      };

      if (action === "approve") {
        updateData.signOffApprovedAt = new Date();
      }

      const updated = await prisma.expense.update({
        where: { id: expenseId },
        data: updateData,
      });

      return apiSuccess(updated);
    }

    // ─── Standard Field Update ───
    const data = updateExpenseSchema.parse(body);

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
