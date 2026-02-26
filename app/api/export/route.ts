import prisma from "@/lib/db";
import { requireOrgMember, apiSuccess, handleApiError } from "@/lib/api-helpers";

export async function GET() {
  try {
    const ctx = await requireOrgMember();

    const [deals, tools, contacts, documents, invoices] = await Promise.all([
      prisma.deal.findMany({
        where: { orgId: ctx.orgId },
        take: 10000,
        include: {
          expenses: true,
          milestones: { include: { tasks: true } },
          activities: true,
          dealContacts: { include: { contact: true } },
          documents: true,
          shoppingListItems: true,
        },
      }),
      prisma.tool.findMany({ where: { orgId: ctx.orgId }, take: 10000 }),
      prisma.contact.findMany({ where: { orgId: ctx.orgId }, take: 10000 }),
      prisma.document.findMany({ where: { orgId: ctx.orgId }, take: 10000 }),
      prisma.invoice.findMany({ where: { orgId: ctx.orgId }, take: 10000 }),
    ]);

    const [checkouts, maintenance, incidents] = await Promise.all([
      prisma.toolCheckout.findMany({ where: { orgId: ctx.orgId }, take: 10000 }),
      prisma.toolMaintenance.findMany({ where: { orgId: ctx.orgId }, take: 10000 }),
      prisma.toolIncident.findMany({ where: { orgId: ctx.orgId }, take: 10000 }),
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
