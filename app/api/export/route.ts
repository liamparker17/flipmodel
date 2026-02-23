import prisma from "@/lib/db";
import { requireOrgMember, apiSuccess, handleApiError } from "@/lib/api-helpers";

export async function GET() {
  try {
    const ctx = await requireOrgMember();

    const [deals, tools, contacts, documents, invoices] = await Promise.all([
      prisma.deal.findMany({
        where: { orgId: ctx.orgId },
        include: {
          expenses: true,
          milestones: { include: { tasks: true } },
          activities: true,
          dealContacts: { include: { contact: true } },
          documents: true,
          shoppingListItems: true,
        },
      }),
      prisma.tool.findMany({ where: { orgId: ctx.orgId } }),
      prisma.contact.findMany({ where: { orgId: ctx.orgId } }),
      prisma.document.findMany({ where: { orgId: ctx.orgId } }),
      prisma.invoice.findMany({ where: { orgId: ctx.orgId } }),
    ]);

    const [checkouts, maintenance, incidents] = await Promise.all([
      prisma.toolCheckout.findMany({ where: { orgId: ctx.orgId } }),
      prisma.toolMaintenance.findMany({ where: { orgId: ctx.orgId } }),
      prisma.toolIncident.findMany({ where: { orgId: ctx.orgId } }),
    ]);

    return apiSuccess({
      exportedAt: new Date().toISOString(),
      version: "1.0",
      data: {
        deals,
        tools: { tools, checkouts, maintenance, incidents },
        contacts,
        documents,
        invoices,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
