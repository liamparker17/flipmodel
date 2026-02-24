import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { requirePermission, apiSuccess, apiError, handleApiError } from "@/lib/api-helpers";
import { getValidTokens } from "@/lib/accounting/token-manager";
import { xeroProvider } from "@/lib/accounting/xero";
import { quickbooksProvider } from "@/lib/accounting/quickbooks";
import type { AccountingProvider } from "@/lib/accounting/providers";
import { rateLimit } from "@/lib/rate-limit";

function getProvider(name: string): AccountingProvider {
  if (name === "xero") return xeroProvider;
  if (name === "quickbooks") return quickbooksProvider;
  throw new Error(`Unknown provider: ${name}`);
}

// POST /api/accounting/sync — trigger a sync
export async function POST(req: NextRequest) {
  try {
    const ctx = await requirePermission("accounting:write");

    // Rate limit: max 1 sync per 2 minutes per org
    const { success: rlOk } = rateLimit(`sync:${ctx.orgId}`, 1, 2 * 60 * 1000);
    if (!rlOk) return apiError("Please wait before syncing again", 429);

    const body = await req.json();
    const syncType = body.type || "accounts"; // accounts | contacts | invoices | all

    const connection = await prisma.accountingConnection.findFirst({
      where: { orgId: ctx.orgId },
    });
    if (!connection) return apiError("No accounting connection found", 404);
    if (connection.provider === "manual") return apiError("Manual accounting does not support sync", 400);
    if (connection.status !== "connected") return apiError(`Connection is ${connection.status}. Please reconnect.`, 400);

    const provider = getProvider(connection.provider);
    const tokens = await getValidTokens(connection.id);

    const results: Record<string, unknown> = {};

    // Sync chart of accounts
    if (syncType === "accounts" || syncType === "all") {
      const externalAccounts = await provider.getAccounts(tokens);
      let imported = 0;

      for (const acct of externalAccounts) {
        // Upsert by externalId
        const existing = await prisma.chartOfAccount.findFirst({
          where: { orgId: ctx.orgId, externalId: acct.externalId },
        });

        if (existing) {
          await prisma.chartOfAccount.update({
            where: { id: existing.id },
            data: { name: acct.name, code: acct.code || existing.code },
          });
        } else {
          await prisma.chartOfAccount.create({
            data: {
              orgId: ctx.orgId,
              code: acct.code || `EXT-${acct.externalId.slice(0, 8)}`,
              name: acct.name,
              type: mapAccountType(acct.type),
              subtype: "other_expense",
              externalId: acct.externalId,
              isActive: acct.status !== "ARCHIVED",
              isSystemAccount: false,
            },
          });
          imported++;
        }
      }

      results.accounts = { total: externalAccounts.length, imported };
    }

    // Sync contacts
    if (syncType === "contacts" || syncType === "all") {
      const externalContacts = await provider.getContacts(tokens);
      let imported = 0;

      for (const ext of externalContacts) {
        // Check if contact already synced
        const syncRecord = await prisma.accountingSync.findFirst({
          where: { orgId: ctx.orgId, entityType: "contact", externalId: ext.externalId },
        });

        if (!syncRecord) {
          // Create contact in our system
          const contact = await prisma.contact.create({
            data: {
              orgId: ctx.orgId,
              userId: ctx.userId,
              name: ext.name,
              email: ext.email || null,
              phone: ext.phone || null,
              role: ext.isSupplier ? "contractor" : "buyer",
            },
          });

          // Track the sync mapping
          await prisma.accountingSync.create({
            data: {
              orgId: ctx.orgId,
              entityType: "contact",
              entityId: contact.id,
              externalId: ext.externalId,
              direction: "inbound",
              status: "synced",
              lastSyncedAt: new Date(),
            },
          });
          imported++;
        }
      }

      results.contacts = { total: externalContacts.length, imported };
    }

    // Sync invoices (read-only import)
    if (syncType === "invoices" || syncType === "all") {
      const externalInvoices = await provider.getInvoices(tokens);
      results.invoices = { total: externalInvoices.length, preview: externalInvoices.slice(0, 5) };
    }

    // Update last sync timestamp
    await prisma.accountingConnection.update({
      where: { id: connection.id },
      data: { lastSyncAt: new Date() },
    });

    return apiSuccess({ synced: true, results });
  } catch (error) {
    return handleApiError(error);
  }
}

// GET /api/accounting/sync — get sync status / history
export async function GET() {
  try {
    const ctx = await requirePermission("accounting:read");

    const connection = await prisma.accountingConnection.findFirst({
      where: { orgId: ctx.orgId },
      select: { id: true, provider: true, lastSyncAt: true, status: true },
    });

    if (!connection) return apiSuccess({ syncs: [], connection: null });

    const syncs = await prisma.accountingSync.findMany({
      where: { orgId: ctx.orgId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return apiSuccess({ connection, syncs });
  } catch (error) {
    return handleApiError(error);
  }
}

function mapAccountType(externalType: string): string {
  const t = externalType.toUpperCase();
  if (t.includes("ASSET") || t === "BANK" || t === "CURRENT") return "asset";
  if (t.includes("LIABILITY") || t === "CURRLIAB" || t.includes("PAYABLE")) return "liability";
  if (t.includes("EQUITY")) return "equity";
  if (t.includes("REVENUE") || t.includes("INCOME") || t === "SALES") return "revenue";
  return "expense";
}
