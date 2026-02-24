// ─── Resolve accounting credentials from DB (org settings) or env vars ───

import prisma from "@/lib/db";
import { encrypt, decrypt, isEncrypted } from "@/lib/encryption";
import type { ProviderCredentials } from "./providers";

/**
 * Get credentials for a provider, checking org-level DB storage first, then env vars.
 * Credentials stored in DB are encrypted at rest.
 */
export async function getCredentials(
  provider: "xero" | "quickbooks",
  orgId: string,
): Promise<ProviderCredentials | null> {
  // 1. Check org-level stored credentials first
  try {
    const org = await prisma.organisation.findUnique({
      where: { id: orgId },
      select: { settings: true },
    });

    const settings = (org?.settings as Record<string, unknown>) || {};
    const creds = (settings.accountingCredentials as Record<string, string>) || {};

    if (provider === "xero" && creds.xeroClientId && creds.xeroClientSecret) {
      return {
        clientId: decryptIfEncrypted(creds.xeroClientId),
        clientSecret: decryptIfEncrypted(creds.xeroClientSecret),
      };
    }

    if (provider === "quickbooks" && creds.quickbooksClientId && creds.quickbooksClientSecret) {
      return {
        clientId: decryptIfEncrypted(creds.quickbooksClientId),
        clientSecret: decryptIfEncrypted(creds.quickbooksClientSecret),
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
 * Encrypt credentials before storing in DB.
 */
export function encryptCredentials(value: string): string {
  return encrypt(value);
}

/**
 * Decrypt a value if it appears to be encrypted, otherwise return as-is.
 * This provides backwards compatibility with any plaintext values stored before encryption was added.
 */
function decryptIfEncrypted(value: string): string {
  if (isEncrypted(value)) {
    try {
      return decrypt(value);
    } catch {
      // If decryption fails, it might be a plaintext value that looks like base64
      return value;
    }
  }
  return value;
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
