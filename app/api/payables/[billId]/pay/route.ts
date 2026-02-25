import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { requirePermission, apiSuccess, apiError, handleApiError } from "@/lib/api-helpers";
import { createBillPaymentSchema } from "@/lib/validations/payables";
import { writeAuditLog } from "@/lib/audit";

type Params = { params: Promise<{ billId: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const ctx = await requirePermission("accounting:write");
    const { billId } = await params;
    const body = await req.json();
    const data = createBillPaymentSchema.parse(body);

    const bill = await prisma.vendorBill.findFirst({
      where: { id: billId, orgId: ctx.orgId },
    });
    if (!bill) return apiError("Vendor bill not found", 404);

    const newAmountPaid = (bill.amountPaid ?? 0) + data.amount;
    if (newAmountPaid > bill.total) {
      return apiError(
        `Payment would exceed bill total. Bill total: ${bill.total}, already paid: ${bill.amountPaid ?? 0}, payment: ${data.amount}`,
        400
      );
    }

    const [payment] = await prisma.$transaction([
      prisma.billPayment.create({
        data: {
          vendorBillId: billId,
          orgId: ctx.orgId,
          amount: data.amount,
          paymentDate: new Date(data.paymentDate),
          paymentMethod: data.paymentMethod,
          reference: data.reference,
          bankAccountId: data.bankAccountId,
          notes: data.notes,
        },
      }),
      prisma.vendorBill.update({
        where: { id: billId },
        data: {
          amountPaid: newAmountPaid,
          status: newAmountPaid >= bill.total ? "paid" : "partially_paid",
        },
      }),
    ]);

    await writeAuditLog({
      orgId: ctx.orgId,
      userId: ctx.userId,
      action: "payment",
      entityType: "VendorBill",
      entityId: billId,
      metadata: {
        paymentId: payment.id,
        amount: data.amount,
        newAmountPaid,
        billTotal: bill.total,
      },
    });

    return apiSuccess(payment, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
