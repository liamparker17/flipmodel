import prisma from "@/lib/db";
import { requireAuth, apiSuccess, handleApiError } from "@/lib/api-helpers";

export async function GET() {
  try {
    const userId = await requireAuth();

    const [deals, tools, contacts, documents, invoices] = await Promise.all([
      prisma.deal.findMany({
        where: { userId },
        include: {
          expenses: true,
          milestones: { include: { tasks: true } },
          activities: true,
          dealContacts: { include: { contact: true } },
          documents: true,
          shoppingListItems: true,
        },
      }),
      prisma.tool.findMany({ where: { userId } }),
      prisma.contact.findMany({ where: { userId } }),
      prisma.document.findMany({ where: { userId } }),
      prisma.invoice.findMany({ where: { userId } }),
    ]);

    const [checkouts, maintenance, incidents] = await Promise.all([
      prisma.toolCheckout.findMany({ where: { userId } }),
      prisma.toolMaintenance.findMany({ where: { userId } }),
      prisma.toolIncident.findMany({ where: { userId } }),
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
