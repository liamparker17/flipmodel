// ─── Token manager: refresh expired tokens automatically ───

import prisma from "@/lib/db";
import { encrypt, decrypt, isEncrypted } from "@/lib/encryption";
import type { OAuthTokens } from "./providers";
import { xeroProvider } from "./xero";
import { quickbooksProvider } from "./quickbooks";
import { getCredentials } from "./credentials";
import { logger } from "../logger";

/**
 * Decrypt a token value if encrypted, otherwise return as-is
 * (backwards compatible with any pre-encryption tokens).
 */
function decryptToken(value: string): string {
  if (isEncrypted(value)) {
    try { return decrypt(value); } catch { return value; }
  }
  return value;
}

export async function getValidTokens(connectionId: string): Promise<OAuthTokens> {
  const connection = await prisma.accountingConnection.findUniqueOrThrow({
    where: { id: connectionId },
  });

  if (!connection.accessToken || !connection.refreshToken) {
    throw new Error("No tokens stored for this connection");
  }

  const tokens: OAuthTokens = {
    accessToken: decryptToken(connection.accessToken),
    refreshToken: decryptToken(connection.refreshToken),
    expiresAt: connection.tokenExpiresAt || new Date(0),
    tenantId: connection.externalOrgId || undefined,
  };

  // If token expires within 5 minutes, refresh it
  const fiveMinutes = 5 * 60 * 1000;
  if (tokens.expiresAt.getTime() - Date.now() < fiveMinutes) {
    // Resolve credentials for this org to pass to the provider
    const creds = await getCredentials(
      connection.provider as "xero" | "quickbooks",
      connection.orgId
    );
    if (!creds) {
      throw new Error("Provider credentials not found — cannot refresh tokens");
    }

    const provider = connection.provider === "xero" ? xeroProvider : quickbooksProvider;

    try {
      const refreshed = await provider.refreshTokens(tokens.refreshToken, creds);

      // Persist the new tokens (encrypted)
      await prisma.accountingConnection.update({
        where: { id: connectionId },
        data: {
          accessToken: encrypt(refreshed.accessToken),
          refreshToken: encrypt(refreshed.refreshToken),
          tokenExpiresAt: refreshed.expiresAt,
          status: "connected",
          ...(refreshed.tenantId ? { externalOrgId: refreshed.tenantId } : {}),
        },
      });

      logger.info("Token refreshed", { connectionId, provider: connection.provider });

      return { ...refreshed, tenantId: refreshed.tenantId || tokens.tenantId };
    } catch (error) {
      // Mark connection as expired if refresh fails
      await prisma.accountingConnection.update({
        where: { id: connectionId },
        data: { status: "expired" },
      });
      logger.error("Token refresh failed", { connectionId, error });
      throw new Error("Token refresh failed. Please reconnect your accounting provider.");
    }
  }

  return tokens;
}
