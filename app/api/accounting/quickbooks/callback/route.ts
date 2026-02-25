import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/api-helpers";
import { quickbooksProvider } from "@/lib/accounting/quickbooks";
import { validateOAuthState } from "@/lib/accounting/providers";
import { getCredentials } from "@/lib/accounting/credentials";
import { encrypt } from "@/lib/encryption";
import prisma from "@/lib/db";
import { logger } from "@/lib/logger";

export async function GET(req: NextRequest) {
  try {
    const ctx = await requirePermission("accounting:write");
    const { searchParams } = new URL(req.url);

    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const realmId = searchParams.get("realmId");
    const error = searchParams.get("error");

    if (error) {
      const base = process.env.NEXTAUTH_URL || "http://localhost:3000";
      return NextResponse.redirect(
        `${base}/settings?accounting_error=${encodeURIComponent(error)}`
      );
    }

    if (!code || !state || !realmId) {
      return NextResponse.json(
        { error: "Missing code, state, or realmId" },
        { status: 400 }
      );
    }

    // Validate OAuth state from database (one-time use)
    const stateData = await validateOAuthState(state);
    if (!stateData) {
      return NextResponse.json({ error: "Invalid or expired OAuth state" }, { status: 400 });
    }

    // Validate state belongs to this org
    if (stateData.orgId !== ctx.orgId) {
      return NextResponse.json({ error: "Invalid state parameter" }, { status: 400 });
    }

    const returnTo = stateData.returnTo || "";

    // Resolve credentials for this org
    const creds = await getCredentials("quickbooks", ctx.orgId);
    if (!creds) {
      return NextResponse.json({ error: "QuickBooks credentials not found" }, { status: 400 });
    }

    // Check no existing connection
    const existing = await prisma.accountingConnection.findFirst({
      where: { orgId: ctx.orgId },
    });
    if (existing) {
      const base = process.env.NEXTAUTH_URL || "http://localhost:3000";
      return NextResponse.redirect(
        `${base}/settings?accounting_error=${encodeURIComponent("Connection already exists")}`
      );
    }

    // Exchange code for tokens (credentials passed as parameter, not global)
    const tokens = await quickbooksProvider.exchangeCode(code, creds);
    tokens.tenantId = realmId;

    // Get the QuickBooks company info
    const qbOrg = await quickbooksProvider.getOrganisation(tokens);

    // Store tokens encrypted at rest
    await prisma.accountingConnection.create({
      data: {
        orgId: ctx.orgId,
        provider: "quickbooks",
        status: "connected",
        accessToken: encrypt(tokens.accessToken),
        refreshToken: encrypt(tokens.refreshToken),
        tokenExpiresAt: tokens.expiresAt,
        externalOrgId: realmId,
        settings: { companyName: qbOrg.name },
      },
    });

    logger.info("QuickBooks connected", { orgId: ctx.orgId, userId: ctx.userId });

    const base = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const redirectPath = returnTo === "onboarding" ? "/onboarding" : "/settings";
    return NextResponse.redirect(`${base}${redirectPath}?accounting_connected=quickbooks`);
  } catch (error) {
    logger.error("QuickBooks callback error", { error });
    const base = process.env.NEXTAUTH_URL || "http://localhost:3000";
    return NextResponse.redirect(
      `${base}/settings?accounting_error=${encodeURIComponent("Connection failed. Please try again.")}`
    );
  }
}
