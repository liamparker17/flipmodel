import prisma from "@/lib/db";
import { requireOrgMember, apiSuccess, handleApiError } from "@/lib/api-helpers";

export async function POST() {
  try {
    const ctx = await requireOrgMember();
    const { userId, orgId } = ctx;

    let totalUpdated = 0;

    // Tables with userId + orgId
    const userOwnedTables = [
      "deal",
      "expense",
      "milestone",
      "activity",
      "contact",
      "document",
      "shoppingListItem",
      "tool",
      "toolCheckout",
      "toolMaintenance",
      "toolIncident",
      "notification",
      "invoice",
    ] as const;

    for (const table of userOwnedTables) {
      const result = await (prisma[table] as any).updateMany({
        where: { userId, orgId: { equals: null } },
        data: { orgId },
      });
      totalUpdated += result.count;
    }

    // DealContact has no userId — migrate via the user's deals
    const userDealIds = await prisma.deal.findMany({
      where: { userId },
      select: { id: true },
    });
    if (userDealIds.length > 0) {
      const result = await (prisma.dealContact as any).updateMany({
        where: {
          dealId: { in: userDealIds.map((d) => d.id) },
          orgId: null,
        },
        data: { orgId },
      });
      totalUpdated += result.count;
    }

    return apiSuccess({ migrated: totalUpdated });
  } catch (error) {
    return handleApiError(error);
  }
}
