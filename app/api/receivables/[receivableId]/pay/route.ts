import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { requirePermission, apiSuccess, apiError, handleApiError } from "@/lib/api-helpers";
import { createReceivablePaymentSchema } from "@/lib/validations/receivables";
import { writeAuditLog } from "@/lib/audit";

type Params = { params: Promise<{ receivableId: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const ctx = await requirePermission("accounting:write");
    const { receivableId } = await params;
    const body = await req.json();
    const data = createReceivablePaymentSchema.parse(body);

    const receivable = await prisma.customerReceivable.findFirst({
      where: { id: receivableId, orgId: ctx.orgId },
    });
    if (!receivable) return apiError("Receivable not found", 404);

    if (receivable.amountPaid + data.amount > receivable.totalAmount) {
      return apiError("Payment amount would exceed total amount owed", 400);
    }

    const newAmountPaid = receivable.amountPaid + data.amount;
    const newStatus = newAmountPaid >= receivable.totalAmount ? "paid" : "partially_paid";

    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.receivablePayment.create({
        data: {
          orgId: ctx.orgId,
          customerReceivableId: receivableId,
          amount: data.amount,
          paymentDate: new Date(data.paymentDate),
          paymentMethod: data.paymentMethod,
          reference: data.reference,
          bankAccountId: data.bankAccountId,
          notes: data.notes,
        },
      });

      const updated = await tx.customerReceivable.update({
        where: { id: receivableId },
        data: {
          amountPaid: newAmountPaid,
          status: newStatus,
        },
        include: { payments: true },
      });

      return { payment, receivable: updated };
    });

    await writeAuditLog({
      orgId: ctx.orgId,
      userId: ctx.userId,
      action: "payment",
      entityType: "Receivable",
      entityId: receivableId,
      metadata: {
        paymentId: result.payment.id,
        amount: data.amount,
        newAmountPaid,
        newStatus,
      },
    });

    return apiSuccess(result, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
