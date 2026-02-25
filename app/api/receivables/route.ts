import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { requireOrgMember, requirePermission, apiSuccess, handleApiError } from "@/lib/api-helpers";
import { parsePagination, paginatedResult } from "@/lib/pagination";
import { createReceivableSchema } from "@/lib/validations/receivables";
import { writeAuditLog } from "@/lib/audit";

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireOrgMember();
    const pagination = parsePagination(req);
    const status = req.nextUrl.searchParams.get("status");
    const contactId = req.nextUrl.searchParams.get("contactId");

    const where: Record<string, unknown> = { orgId: ctx.orgId };
    if (status) where.status = status;
    if (contactId) where.contactId = contactId;

    const [receivables, total] = await Promise.all([
      prisma.customerReceivable.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: pagination.skip,
        take: pagination.limit,
      }),
      prisma.customerReceivable.count({ where }),
    ]);

    return apiSuccess(paginatedResult(receivables, total, pagination));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requirePermission("accounting:write");
    const body = await req.json();
    const data = createReceivableSchema.parse(body);

    const receivable = await prisma.customerReceivable.create({
      data: {
        orgId: ctx.orgId,
        userId: ctx.userId,
        invoiceId: data.invoiceId,
        contactId: data.contactId,
        dealId: data.dealId,
        totalAmount: data.totalAmount,
        amountPaid: 0,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        currency: data.currency || "ZAR",
        notes: data.notes,
        status: "outstanding",
      },
    });

    await writeAuditLog({
      orgId: ctx.orgId,
      userId: ctx.userId,
      action: "create",
      entityType: "Receivable",
      entityId: receivable.id,
    });

    return apiSuccess(receivable, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
