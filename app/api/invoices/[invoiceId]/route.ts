import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { requireOrgMember, requirePermission, apiSuccess, apiError, handleApiError } from "@/lib/api-helpers";
import { writeAuditLog, diffChanges } from "@/lib/audit";
import { z } from "zod";

const updateInvoiceSchema = z.object({
  invoiceNumber: z.string().min(1).optional(),
  contactId: z.string().nullable().optional(),
  dealId: z.string().nullable().optional(),
  status: z.string().optional(),
  issueDate: z.string().optional(),
  dueDate: z.string().nullable().optional(),
  subtotal: z.number().min(0).optional(),
  tax: z.number().min(0).optional(),
  total: z.number().min(0).optional(),
  notes: z.string().nullable().optional(),
  lineItems: z.array(z.object({
    description: z.string().min(1).max(500),
    quantity: z.number().positive(),
    unitPrice: z.number().min(0),
    amount: z.number().min(0),
  })).optional(),
});

type Params = { params: Promise<{ invoiceId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const ctx = await requireOrgMember();
    const { invoiceId } = await params;

    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, orgId: ctx.orgId },
    });

    if (!invoice) return apiError("Invoice not found", 404);
    return apiSuccess(invoice);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const ctx = await requirePermission("invoices:write");
    const { invoiceId } = await params;
    const body = await req.json();
    const data = updateInvoiceSchema.parse(body);

    const existing = await prisma.invoice.findFirst({
      where: { id: invoiceId, orgId: ctx.orgId },
    });
    if (!existing) return apiError("Invoice not found", 404);

    const updateData: Record<string, unknown> = {};
    if (data.invoiceNumber !== undefined) updateData.invoiceNumber = data.invoiceNumber;
    if (data.contactId !== undefined) updateData.contactId = data.contactId;
    if (data.dealId !== undefined) updateData.dealId = data.dealId;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.issueDate !== undefined) updateData.issueDate = new Date(data.issueDate);
    if (data.dueDate !== undefined) updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
    if (data.subtotal !== undefined) updateData.subtotal = data.subtotal;
    if (data.tax !== undefined) updateData.tax = data.tax;
    if (data.total !== undefined) updateData.total = data.total;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.lineItems !== undefined) updateData.lineItems = data.lineItems;

    const invoice = await prisma.invoice.update({
      where: { id: invoiceId },
      data: updateData,
    });

    const changes = diffChanges(
      existing as unknown as Record<string, unknown>,
      updateData,
      ["status", "total", "subtotal", "tax", "dueDate"]
    );

    await writeAuditLog({
      orgId: ctx.orgId,
      userId: ctx.userId,
      action: "update",
      entityType: "invoice",
      entityId: invoiceId,
      changes,
    });

    return apiSuccess(invoice);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const ctx = await requirePermission("invoices:write");
    const { invoiceId } = await params;

    const existing = await prisma.invoice.findFirst({
      where: { id: invoiceId, orgId: ctx.orgId },
    });
    if (!existing) return apiError("Invoice not found", 404);

    if (existing.status === "paid") {
      return apiError("Cannot delete a paid invoice", 400);
    }

    await prisma.invoice.delete({ where: { id: invoiceId } });

    await writeAuditLog({
      orgId: ctx.orgId,
      userId: ctx.userId,
      action: "delete",
      entityType: "invoice",
      entityId: invoiceId,
    });

    return apiSuccess({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
