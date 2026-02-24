// ─── Token manager: refresh expired tokens automatically ───

import prisma from "@/lib/db";
import type { OAuthTokens } from "./providers";
import { xeroProvider } from "./xero";
import { quickbooksProvider } from "./quickbooks";

export async function getValidTokens(connectionId: string): Promise<OAuthTokens> {
  const connection = await prisma.accountingConnection.findUniqueOrThrow({
    where: { id: connectionId },
  });

  if (!connection.accessToken || !connection.refreshToken) {
    throw new Error("No tokens stored for this connection");
  }

  const tokens: OAuthTokens = {
    accessToken: connection.accessToken,
    refreshToken: connection.refreshToken,
    expiresAt: connection.tokenExpiresAt || new Date(0),
    tenantId: connection.externalOrgId || undefined,
  };

  // If token expires within 5 minutes, refresh it
  const fiveMinutes = 5 * 60 * 1000;
  if (tokens.expiresAt.getTime() - Date.now() < fiveMinutes) {
    const provider = connection.provider === "xero" ? xeroProvider : quickbooksProvider;

    try {
      const refreshed = await provider.refreshTokens(tokens.refreshToken);

      // Persist the new tokens
      await prisma.accountingConnection.update({
        where: { id: connectionId },
        data: {
          accessToken: refreshed.accessToken,
          refreshToken: refreshed.refreshToken,
          tokenExpiresAt: refreshed.expiresAt,
          status: "connected",
          ...(refreshed.tenantId ? { externalOrgId: refreshed.tenantId } : {}),
        },
      });

      return { ...refreshed, tenantId: refreshed.tenantId || tokens.tenantId };
    } catch (error) {
      // Mark connection as expired if refresh fails
      await prisma.accountingConnection.update({
        where: { id: connectionId },
        data: { status: "expired" },
      });
      throw new Error(`Token refresh failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  return tokens;
}
