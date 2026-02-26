import { NextRequest } from "next/server";
import { requirePermission, apiSuccess, apiError, handleApiError, NotFoundError, ValidationError } from "@/lib/api-helpers";
import { createBillPaymentSchema } from "@/lib/validations/payables";
import { withFinancialTransaction } from "@/lib/financial-transaction";

type Params = { params: Promise<{ billId: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const ctx = await requirePermission("accounting:write");
    const { billId } = await params;
    const idempotencyKey = req.headers.get("x-idempotency-key");
    const body = await req.json();
    const data = createBillPaymentSchema.parse(body);

    // Idempotency check — reject duplicate keys within same org
    if (idempotencyKey) {
      const existing = await (await import("@/lib/db")).default.billPayment.findFirst({
        where: { orgId: ctx.orgId, idempotencyKey },
      });
      if (existing) {
        return apiSuccess(existing, 201); // Return existing payment — safe replay
      }
    }

    const payment = await withFinancialTransaction({
      tx: async (tx) => {
        // Read inside serializable transaction — prevents TOCTOU race
        const bill = await tx.vendorBill.findFirst({
          where: { id: billId, orgId: ctx.orgId },
        });

        if (!bill) throw new NotFoundError("Vendor bill not found");

        // Only approved or partially_paid bills can receive payments
        if (bill.status !== "approved" && bill.status !== "partially_paid") {
          throw new ValidationError(
            "BILL_NOT_PAYABLE",
            `Bill must be approved before payment. Current status: ${bill.status}`,
          );
        }

        // Validate payment date is not before bill issue date
        const paymentDate = new Date(data.paymentDate);
        if (paymentDate < bill.issueDate) {
          throw new ValidationError(
            "PAYMENT_BEFORE_BILL_DATE",
            `Payment date (${data.paymentDate}) cannot be before bill issue date (${bill.issueDate.toISOString().slice(0, 10)})`,
          );
        }

        const newAmountPaid = (bill.amountPaid ?? 0) + data.amount;

        if (newAmountPaid > bill.total) {
          throw new ValidationError(
            "OVERPAYMENT_ATTEMPT",
            `Payment would exceed bill total. Bill total: ${bill.total}, already paid: ${bill.amountPaid ?? 0}, payment: ${data.amount}`,
          );
        }

        const payment = await tx.billPayment.create({
          data: {
            vendorBillId: billId,
            orgId: ctx.orgId,
            amount: data.amount,
            paymentDate,
            paymentMethod: data.paymentMethod,
            reference: data.reference,
            bankAccountId: data.bankAccountId,
            idempotencyKey: idempotencyKey ?? undefined,
            notes: data.notes,
          },
        });

        // Atomic conditional update — DB enforces the guard
        const updateResult = await tx.vendorBill.updateMany({
          where: {
            id: billId,
            orgId: ctx.orgId,
            // DB-level guard: only update if current amountPaid + payment <= total
            amountPaid: { lte: bill.total - data.amount },
          },
          data: {
            amountPaid: { increment: data.amount },
            status: newAmountPaid >= bill.total ? "paid" : "partially_paid",
          },
        });

        if (updateResult.count === 0) {
          throw new ValidationError(
            "CONCURRENT_PAYMENT_CONFLICT",
            "Another payment was recorded concurrently. Please retry.",
          );
        }

        return { payment, newAmountPaid, billTotal: bill.total };
      },
      audit: (result) => ({
        orgId: ctx.orgId,
        userId: ctx.userId,
        action: "payment",
        entityType: "VendorBill",
        entityId: billId,
        metadata: {
          paymentId: result.payment.id,
          amount: data.amount,
          newAmountPaid: result.newAmountPaid,
          billTotal: result.billTotal,
        },
      }),
      isolationLevel: "Serializable",
    });

    return apiSuccess(payment.payment, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
