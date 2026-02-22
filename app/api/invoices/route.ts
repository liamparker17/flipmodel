import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { requireAuth, apiSuccess, handleApiError } from "@/lib/api-helpers";
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
  lineItems: z.any().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const userId = await requireAuth();
    const dealId = req.nextUrl.searchParams.get("dealId");

    const where: Record<string, unknown> = { userId };
    if (dealId) where.dealId = dealId;

    const invoices = await prisma.invoice.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
    return apiSuccess(invoices);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await requireAuth();
    const body = await req.json();
    const data = createInvoiceSchema.parse(body);

    const invoice = await prisma.invoice.create({
      data: {
        userId,
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
