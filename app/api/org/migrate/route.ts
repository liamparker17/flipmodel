import prisma from "@/lib/db";
import { requireOrgMember, apiSuccess, handleApiError } from "@/lib/api-helpers";
import type { PrismaClient } from "@prisma/client";

/** Delegate type that exposes updateMany — shared by all Prisma model delegates. */
type ModelDelegate = {
  updateMany(args: { where: Record<string, unknown>; data: Record<string, unknown> }): Promise<{ count: number }>;
};

/** The subset of PrismaClient model keys we need to migrate. */
type MigratableModelKey =
  | "deal" | "expense" | "milestone" | "activity" | "contact"
  | "document" | "shoppingListItem" | "tool" | "toolCheckout"
  | "toolMaintenance" | "toolIncident" | "notification" | "invoice";

export async function POST() {
  try {
    const ctx = await requireOrgMember();
    const { userId, orgId } = ctx;

    let totalUpdated = 0;

    // Tables with userId + orgId
    const userOwnedTables: MigratableModelKey[] = [
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
    ];

    for (const table of userOwnedTables) {
      const delegate = prisma[table] as unknown as ModelDelegate;
      const result = await delegate.updateMany({
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
      const result = await prisma.dealContact.updateMany({
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
