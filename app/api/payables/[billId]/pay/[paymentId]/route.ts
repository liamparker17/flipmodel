import { NextRequest } from "next/server";
import { requirePermission, apiSuccess, handleApiError, NotFoundError, ValidationError } from "@/lib/api-helpers";
import { withFinancialTransaction } from "@/lib/financial-transaction";

type Params = { params: Promise<{ billId: string; paymentId: string }> };

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const ctx = await requirePermission("accounting:write");
    const { billId, paymentId } = await params;

    const result = await withFinancialTransaction({
      tx: async (tx) => {
        const bill = await tx.vendorBill.findFirst({
          where: { id: billId, orgId: ctx.orgId },
        });

        if (!bill) throw new NotFoundError("Vendor bill not found");

        const payment = await tx.billPayment.findFirst({
          where: { id: paymentId, vendorBillId: billId, orgId: ctx.orgId },
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
        await tx.billPayment.delete({ where: { id: paymentId } });

        // Recalculate amountPaid from remaining payments
        const remaining = await tx.billPayment.aggregate({
          where: { vendorBillId: billId },
          _sum: { amount: true },
        });

        const newAmountPaid = remaining._sum.amount ?? 0;

        // Recalculate status
        let newStatus: string;
        if (newAmountPaid <= 0) {
          newStatus = bill.status === "draft" ? "draft" : "approved";
        } else if (newAmountPaid >= bill.total) {
          newStatus = "paid";
        } else {
          newStatus = "partially_paid";
        }

        await tx.vendorBill.update({
          where: { id: billId },
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
        entityType: "VendorBill",
        entityId: billId,
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
