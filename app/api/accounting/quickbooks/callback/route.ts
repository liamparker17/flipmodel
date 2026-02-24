import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/api-helpers";
import { quickbooksProvider } from "@/lib/accounting/quickbooks";
import { validateOAuthState } from "@/lib/accounting/providers";
import prisma from "@/lib/db";

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

    // Validate OAuth state to prevent CSRF attacks
    if (!validateOAuthState(state)) {
      return NextResponse.json({ error: "Invalid or expired OAuth state" }, { status: 400 });
    }

    // Validate state contains this org's ID
    const stateParts = state.split(":");
    const orgIdFromState = stateParts[0];
    const returnTo = stateParts.slice(2).join(":") || ""; // Everything after orgId:random
    if (orgIdFromState !== ctx.orgId) {
      return NextResponse.json({ error: "Invalid state parameter" }, { status: 400 });
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

    // Exchange code for tokens
    const tokens = await quickbooksProvider.exchangeCode(code);
    tokens.tenantId = realmId;

    // Get the QuickBooks company info
    const qbOrg = await quickbooksProvider.getOrganisation(tokens);

    // Create the connection record
    await prisma.accountingConnection.create({
      data: {
        orgId: ctx.orgId,
        provider: "quickbooks",
        status: "connected",
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        tokenExpiresAt: tokens.expiresAt,
        externalOrgId: realmId,
        settings: { companyName: qbOrg.name },
      },
    });

    const base = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const redirectPath = returnTo === "onboarding" ? "/onboarding" : "/settings";
    return NextResponse.redirect(`${base}${redirectPath}?accounting_connected=quickbooks`);
  } catch (error) {
    console.error("QuickBooks callback error:", error);
    const base = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const msg = error instanceof Error ? error.message : "Connection failed";
    return NextResponse.redirect(
      `${base}/settings?accounting_error=${encodeURIComponent(msg)}`
    );
  }
}
