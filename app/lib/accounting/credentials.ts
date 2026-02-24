// ─── Resolve accounting credentials from DB (org settings) or env vars ───

import prisma from "@/lib/db";

export interface AccountingCredentials {
  clientId: string;
  clientSecret: string;
  sandbox?: boolean;
}

/**
 * Get credentials for a provider, checking org-level DB storage first, then env vars.
 * This allows orgs to enter their own API keys via the settings UI.
 */
export async function getCredentials(
  provider: "xero" | "quickbooks",
  orgId: string,
): Promise<AccountingCredentials | null> {
  // 1. Check org-level stored credentials first
  try {
    const org = await prisma.organisation.findUnique({
      where: { id: orgId },
      select: { settings: true },
    });

    const settings = (org?.settings as Record<string, unknown>) || {};
    const creds = (settings.accountingCredentials as Record<string, string>) || {};

    if (provider === "xero" && creds.xeroClientId && creds.xeroClientSecret) {
      return { clientId: creds.xeroClientId, clientSecret: creds.xeroClientSecret };
    }

    if (provider === "quickbooks" && creds.quickbooksClientId && creds.quickbooksClientSecret) {
      return {
        clientId: creds.quickbooksClientId,
        clientSecret: creds.quickbooksClientSecret,
        sandbox: creds.quickbooksSandbox === "true",
      };
    }
  } catch {
    // Fall through to env vars
  }

  // 2. Fall back to environment variables
  if (provider === "xero") {
    const id = process.env.XERO_CLIENT_ID;
    const secret = process.env.XERO_CLIENT_SECRET;
    if (id && secret) return { clientId: id, clientSecret: secret };
  }

  if (provider === "quickbooks") {
    const id = process.env.QUICKBOOKS_CLIENT_ID;
    const secret = process.env.QUICKBOOKS_CLIENT_SECRET;
    if (id && secret) {
      return {
        clientId: id,
        clientSecret: secret,
        sandbox: process.env.QUICKBOOKS_SANDBOX === "true",
      };
    }
  }

  return null;
}

/**
 * Check if credentials are available for a provider (from DB or env).
 */
export async function hasCredentials(
  provider: "xero" | "quickbooks",
  orgId: string,
): Promise<boolean> {
  const creds = await getCredentials(provider, orgId);
  return creds !== null;
}
