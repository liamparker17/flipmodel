import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { requireOrgMember, requirePermission, apiSuccess, handleApiError } from "@/lib/api-helpers";
import { parsePagination, paginatedResult } from "@/lib/pagination";
import { z } from "zod";

const createInvoiceSchema = z.object({
  dealId: z.string().optional(),
  contactId: z.string().optional(),
  invoiceNumber: z.string().min(1),
  status: z.string().optional(),
  issueDate: z.string().optional(),
  dueDate: z.string().optional(),
  subtotal: z.number().optional(),
  tax: z.number().optional(),
  total: z.number().optional(),
  notes: z.string().optional(),
  lineItems: z.array(z.object({
    description: z.string().min(1).max(500),
    quantity: z.number().positive(),
    unitPrice: z.number().min(0),
    amount: z.number().min(0),
  })).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const ctx = await requirePermission("invoices:read");
    const dealId = req.nextUrl.searchParams.get("dealId");

    const pagination = parsePagination(req);
    const where: Record<string, unknown> = { orgId: ctx.orgId };
    if (dealId) where.dealId = dealId;

    const total = await prisma.invoice.count({ where });
    const invoices = await prisma.invoice.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: pagination.limit,
      skip: pagination.skip,
    });
    const response = apiSuccess(paginatedResult(invoices, total, pagination));
    response.headers.set("Cache-Control", "private, max-age=30, stale-while-revalidate=60");
    return response;
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requirePermission("invoices:write");
    const body = await req.json();
    const data = createInvoiceSchema.parse(body);

    const invoice = await prisma.invoice.create({
      data: {
        orgId: ctx.orgId,
        userId: ctx.userId,
        dealId: data.dealId,
        invoiceNumber: data.invoiceNumber,
        contactId: data.contactId,
        status: data.status || "draft",
        issueDate: data.issueDate ? new Date(data.issueDate) : new Date(),
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        subtotal: data.subtotal || 0,
        tax: data.tax || 0,
        total: data.total || 0,
        notes: data.notes,
        lineItems: data.lineItems || [],
      },
    });

    return apiSuccess(invoice, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
