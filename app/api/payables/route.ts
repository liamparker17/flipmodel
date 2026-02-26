import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { requireOrgMember, requirePermission, apiSuccess, handleApiError } from "@/lib/api-helpers";
import { parsePagination, paginatedResult } from "@/lib/pagination";
import { createVendorBillSchema } from "@/lib/validations/payables";
import { writeAuditLog } from "@/lib/audit";

export async function GET(req: NextRequest) {
  try {
    const ctx = await requirePermission("payables:read");
    const pagination = parsePagination(req);
    const status = req.nextUrl.searchParams.get("status");
    const contactId = req.nextUrl.searchParams.get("contactId");
    const dealId = req.nextUrl.searchParams.get("dealId");

    const where: Record<string, unknown> = { orgId: ctx.orgId };
    if (status) where.status = status;
    if (contactId) where.contactId = contactId;
    if (dealId) where.dealId = dealId;

    const [bills, total] = await Promise.all([
      prisma.vendorBill.findMany({
        where,
        include: { lines: true },
        orderBy: { createdAt: "desc" },
        skip: pagination.skip,
        take: pagination.limit,
      }),
      prisma.vendorBill.count({ where }),
    ]);

    return apiSuccess(paginatedResult(bills, total, pagination));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requirePermission("accounting:write");
    const body = await req.json();
    const data = createVendorBillSchema.parse(body);

    const bill = await prisma.vendorBill.create({
      data: {
        orgId: ctx.orgId,
        userId: ctx.userId,
        billNumber: data.billNumber,
        contactId: data.contactId,
        dealId: data.dealId,
        issueDate: data.issueDate ? new Date(data.issueDate) : new Date(),
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        subtotal: data.subtotal,
        tax: data.tax,
        total: data.total,
        currency: data.currency,
        notes: data.notes,
        documentUrl: data.documentUrl,
        status: "draft",
        amountPaid: 0,
        lines: {
          create: data.lines.map((line) => ({
            description: line.description,
            quantity: line.quantity ?? 1,
            unitPrice: line.unitPrice,
            amount: line.amount,
            accountCode: line.accountCode,
            dealId: line.dealId,
          })),
        },
      },
      include: { lines: true },
    });

    await writeAuditLog({
      orgId: ctx.orgId,
      userId: ctx.userId,
      action: "create",
      entityType: "VendorBill",
      entityId: bill.id,
      metadata: { billNumber: data.billNumber },
    });

    return apiSuccess(bill, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
