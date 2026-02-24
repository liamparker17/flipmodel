import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/api-helpers";
import { xeroProvider } from "@/lib/accounting/xero";
import { validateOAuthState } from "@/lib/accounting/providers";
import { getCredentials } from "@/lib/accounting/credentials";
import { encrypt } from "@/lib/encryption";
import prisma from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const ctx = await requirePermission("accounting:write");
    const { searchParams } = new URL(req.url);

    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    if (error) {
      const base = process.env.NEXTAUTH_URL || "http://localhost:3000";
      return NextResponse.redirect(
        `${base}/settings?accounting_error=${encodeURIComponent(error)}`
      );
    }

    if (!code || !state) {
      return NextResponse.json({ error: "Missing code or state" }, { status: 400 });
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
    const creds = await getCredentials("xero", ctx.orgId);
    if (!creds) {
      return NextResponse.json({ error: "Xero credentials not found" }, { status: 400 });
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
    const tokens = await xeroProvider.exchangeCode(code, creds);

    // Get the Xero organisation info
    const xeroOrg = await xeroProvider.getOrganisation(tokens);

    // Store tokens encrypted at rest
    await prisma.accountingConnection.create({
      data: {
        orgId: ctx.orgId,
        provider: "xero",
        status: "connected",
        accessToken: encrypt(tokens.accessToken),
        refreshToken: encrypt(tokens.refreshToken),
        tokenExpiresAt: tokens.expiresAt,
        externalOrgId: tokens.tenantId || xeroOrg.id,
        settings: { organisationName: xeroOrg.name },
      },
    });

    console.log(`[AUDIT] Xero connected for org=${ctx.orgId} by user=${ctx.userId}`);

    const base = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const redirectPath = returnTo === "onboarding" ? "/onboarding" : "/settings";
    return NextResponse.redirect(`${base}${redirectPath}?accounting_connected=xero`);
  } catch (error) {
    console.error("Xero callback error:", error);
    const base = process.env.NEXTAUTH_URL || "http://localhost:3000";
    return NextResponse.redirect(
      `${base}/settings?accounting_error=${encodeURIComponent("Connection failed. Please try again.")}`
    );
  }
}
