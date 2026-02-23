/**
 * Organisation Migration Script
 *
 * This script migrates existing single-user data into the new org-scoped model.
 * For each user that has data, it:
 * 1. Creates an Organisation
 * 2. Creates an OrgMember (role: executive) linking the user to the org
 * 3. Backfills orgId on all business records owned by that user
 *
 * Run with: npx tsx prisma/seed-org-migration.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50) || "org";
}

async function main() {
  console.log("Starting organisation migration...\n");

  // Find all users who have any business data
  const users = await prisma.user.findMany({
    include: {
      _count: {
        select: {
          deals: true,
          contacts: true,
          tools: true,
          invoices: true,
        },
      },
    },
  });

  let migratedCount = 0;

  for (const user of users) {
    const hasData =
      user._count.deals > 0 ||
      user._count.contacts > 0 ||
      user._count.tools > 0 ||
      user._count.invoices > 0;

    // Check if user already has an org membership
    const existingMembership = await prisma.orgMember.findFirst({
      where: { userId: user.id },
    });

    if (existingMembership) {
      console.log(`  [SKIP] ${user.email} - already has org membership`);
      continue;
    }

    if (!hasData && !existingMembership) {
      console.log(`  [SKIP] ${user.email} - no business data`);
      continue;
    }

    // Create organisation for this user
    const orgName = user.company || user.name || user.email.split("@")[0];
    let slug = slugify(orgName);

    // Ensure slug uniqueness
    let slugSuffix = 0;
    while (await prisma.organisation.findUnique({ where: { slug: slug + (slugSuffix > 0 ? `-${slugSuffix}` : "") } })) {
      slugSuffix++;
    }
    if (slugSuffix > 0) slug = `${slug}-${slugSuffix}`;

    console.log(`  [MIGRATE] ${user.email} -> org "${orgName}" (${slug})`);

    const org = await prisma.organisation.create({
      data: {
        name: orgName,
        slug,
        currency: "ZAR",
        timezone: "Africa/Johannesburg",
        settings: {
          defaultCurrency: "ZAR",
          timezone: "Africa/Johannesburg",
          fiscalYearStart: 3,
          defaultBondRate: 12.75,
          defaultAgentCommission: 5,
          defaultContingencyPct: 10,
          defaultPmPct: 8,
          defaultRenovationMonths: 4,
        },
        members: {
          create: {
            userId: user.id,
            role: "executive",
            title: "Owner",
          },
        },
      },
    });

    // Backfill orgId on all business tables
    const orgId = org.id;

    await Promise.all([
      prisma.deal.updateMany({ where: { userId: user.id, orgId: "" }, data: { orgId } }).catch(() =>
        prisma.deal.updateMany({ where: { userId: user.id }, data: { orgId } })
      ),
      prisma.expense.updateMany({ where: { userId: user.id }, data: { orgId } }),
      prisma.milestone.updateMany({ where: { userId: user.id }, data: { orgId } }),
      prisma.contact.updateMany({ where: { userId: user.id }, data: { orgId } }),
      prisma.document.updateMany({ where: { userId: user.id }, data: { orgId } }),
      prisma.tool.updateMany({ where: { userId: user.id }, data: { orgId } }),
      prisma.toolCheckout.updateMany({ where: { userId: user.id }, data: { orgId } }),
      prisma.toolMaintenance.updateMany({ where: { userId: user.id }, data: { orgId } }),
      prisma.toolIncident.updateMany({ where: { userId: user.id }, data: { orgId } }),
      prisma.activity.updateMany({ where: { userId: user.id }, data: { orgId } }),
      prisma.shoppingListItem.updateMany({ where: { userId: user.id }, data: { orgId } }),
      prisma.notification.updateMany({ where: { userId: user.id }, data: { orgId } }),
      prisma.invoice.updateMany({ where: { userId: user.id }, data: { orgId } }),
    ]);

    // Backfill DealContacts (no userId, so use deals owned by user)
    const userDeals = await prisma.deal.findMany({
      where: { userId: user.id },
      select: { id: true },
    });
    if (userDeals.length > 0) {
      await prisma.dealContact.updateMany({
        where: { dealId: { in: userDeals.map((d) => d.id) } },
        data: { orgId },
      });
    }

    migratedCount++;
    console.log(`    -> Backfilled orgId on all business records`);
  }

  console.log(`\nMigration complete. Migrated ${migratedCount} user(s).`);
}

main()
  .catch((e) => {
    console.error("Migration failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
