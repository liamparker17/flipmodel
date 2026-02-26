import { NextRequest } from "next/server";
import { requirePermission, apiSuccess, handleApiError, NotFoundError, ValidationError } from "@/lib/api-helpers";
import { createReceivablePaymentSchema } from "@/lib/validations/receivables";
import { withFinancialTransaction } from "@/lib/financial-transaction";

type Params = { params: Promise<{ receivableId: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const ctx = await requirePermission("accounting:write");
    const { receivableId } = await params;
    const idempotencyKey = req.headers.get("x-idempotency-key");
    const body = await req.json();
    const data = createReceivablePaymentSchema.parse(body);

    // Idempotency check — reject duplicate keys within same org
    if (idempotencyKey) {
      const existing = await (await import("@/lib/db")).default.receivablePayment.findFirst({
        where: { orgId: ctx.orgId, idempotencyKey },
      });
      if (existing) {
        return apiSuccess(existing, 201); // Return existing payment — safe replay
      }
    }

    const result = await withFinancialTransaction({
      tx: async (tx) => {
        const receivable = await tx.customerReceivable.findFirst({
          where: { id: receivableId, orgId: ctx.orgId },
        });

        if (!receivable) throw new NotFoundError("Receivable not found");

        const newAmountPaid = receivable.amountPaid + data.amount;

        if (newAmountPaid > receivable.totalAmount) {
          throw new ValidationError(
            "OVERPAYMENT_ATTEMPT",
            "Payment amount would exceed total amount owed",
          );
        }

        const newStatus = newAmountPaid >= receivable.totalAmount ? "paid" : "partially_paid";

        const payment = await tx.receivablePayment.create({
          data: {
            orgId: ctx.orgId,
            customerReceivableId: receivableId,
            amount: data.amount,
            paymentDate: new Date(data.paymentDate),
            paymentMethod: data.paymentMethod,
            reference: data.reference,
            bankAccountId: data.bankAccountId,
            idempotencyKey: idempotencyKey ?? undefined,
            notes: data.notes,
          },
        });

        // Atomic conditional update
        const updateResult = await tx.customerReceivable.updateMany({
          where: {
            id: receivableId,
            orgId: ctx.orgId,
            amountPaid: { lte: receivable.totalAmount - data.amount },
          },
          data: {
            amountPaid: { increment: data.amount },
            status: newStatus,
          },
        });

        if (updateResult.count === 0) {
          throw new ValidationError(
            "CONCURRENT_PAYMENT_CONFLICT",
            "Another payment was recorded concurrently. Please retry.",
          );
        }

        const updated = await tx.customerReceivable.findFirst({
          where: { id: receivableId },
          include: { payments: true },
        });

        return { payment, receivable: updated };
      },
      audit: (result) => ({
        orgId: ctx.orgId,
        userId: ctx.userId,
        action: "payment",
        entityType: "Receivable",
        entityId: receivableId,
        metadata: {
          paymentId: result.payment.id,
          amount: data.amount,
        },
      }),
      isolationLevel: "Serializable",
    });

    return apiSuccess(result, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
