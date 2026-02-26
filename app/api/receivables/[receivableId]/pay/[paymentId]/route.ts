import { NextRequest } from "next/server";
import { requirePermission, apiSuccess, handleApiError, NotFoundError, ValidationError } from "@/lib/api-helpers";
import { withFinancialTransaction } from "@/lib/financial-transaction";

type Params = { params: Promise<{ receivableId: string; paymentId: string }> };

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const ctx = await requirePermission("accounting:write");
    const { receivableId, paymentId } = await params;

    const result = await withFinancialTransaction({
      tx: async (tx) => {
        const receivable = await tx.customerReceivable.findFirst({
          where: { id: receivableId, orgId: ctx.orgId },
        });

        if (!receivable) throw new NotFoundError("Receivable not found");

        const payment = await tx.receivablePayment.findFirst({
          where: { id: paymentId, customerReceivableId: receivableId, orgId: ctx.orgId },
        });

        if (!payment) throw new NotFoundError("Payment not found");

        // Block deletion if payment is linked to a posted journal entry
        if (payment.journalEntryId) {
          const je = await tx.journalEntry.findFirst({
            where: { id: payment.journalEntryId, status: "posted" },
          });
          if (je) {
            throw new ValidationError(
              "LINKED_TO_POSTED_JE",
              `Payment is linked to posted journal entry ${je.entryNumber}. Reverse the journal entry first.`,
            );
          }
        }

        // Delete the payment
        await tx.receivablePayment.delete({ where: { id: paymentId } });

        // Recalculate amountPaid from remaining payments
        const remaining = await tx.receivablePayment.aggregate({
          where: { customerReceivableId: receivableId },
          _sum: { amount: true },
        });

        const newAmountPaid = remaining._sum.amount ?? 0;

        // Recalculate status
        let newStatus: string;
        if (newAmountPaid <= 0) {
          newStatus = "outstanding";
        } else if (newAmountPaid >= receivable.totalAmount) {
          newStatus = "paid";
        } else {
          newStatus = "partially_paid";
        }

        await tx.customerReceivable.update({
          where: { id: receivableId },
          data: {
            amountPaid: newAmountPaid,
            status: newStatus,
          },
        });

        return { deletedPaymentId: paymentId, newAmountPaid, newStatus };
      },
      audit: (result) => ({
        orgId: ctx.orgId,
        userId: ctx.userId,
        action: "delete_payment",
        entityType: "Receivable",
        entityId: receivableId,
        metadata: {
          paymentId,
          newAmountPaid: result.newAmountPaid,
          newStatus: result.newStatus,
        },
      }),
      isolationLevel: "Serializable",
    });

    return apiSuccess(result);
  } catch (error) {
    return handleApiError(error);
  }
}
