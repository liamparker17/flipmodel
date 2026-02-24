import { NextRequest, NextResponse } from "next/server";
import { requirePermission, handleApiError } from "@/lib/api-helpers";
import { xeroProvider } from "@/lib/accounting/xero";
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
    const tokens = await xeroProvider.exchangeCode(code);

    // Get the Xero organisation info
    const xeroOrg = await xeroProvider.getOrganisation(tokens);

    // Create the connection record
    await prisma.accountingConnection.create({
      data: {
        orgId: ctx.orgId,
        provider: "xero",
        status: "connected",
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        tokenExpiresAt: tokens.expiresAt,
        externalOrgId: tokens.tenantId || xeroOrg.id,
        settings: { organisationName: xeroOrg.name },
      },
    });

    const base = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const redirectPath = returnTo === "onboarding" ? "/onboarding" : "/settings";
    return NextResponse.redirect(`${base}${redirectPath}?accounting_connected=xero`);
  } catch (error) {
    console.error("Xero callback error:", error);
    const base = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const msg = error instanceof Error ? error.message : "Connection failed";
    return NextResponse.redirect(
      `${base}/settings?accounting_error=${encodeURIComponent(msg)}`
    );
  }
}
