import { NextRequest, NextResponse } from "next/server";
import { requirePermission, apiError, handleApiError } from "@/lib/api-helpers";
import { xeroProvider } from "@/lib/accounting/xero";
import { storeOAuthState } from "@/lib/accounting/providers";
import { getCredentials } from "@/lib/accounting/credentials";
import prisma from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const ctx = await requirePermission("accounting:write");

    // Resolve credentials (DB first, then env)
    const creds = await getCredentials("xero", ctx.orgId);
    if (!creds) {
      return apiError("Xero credentials not configured. Add them in Settings > Accounting.", 400);
    }

    // Check no existing connection
    const existing = await prisma.accountingConnection.findFirst({
      where: { orgId: ctx.orgId },
    });
    if (existing) {
      return NextResponse.json(
        { error: "An accounting connection already exists. Disconnect first." },
        { status: 400 }
      );
    }

    // Support returnTo for onboarding flow
    const returnTo = new URL(req.url).searchParams.get("returnTo") || undefined;

    // Store state in database (not in-memory)
    const state = await storeOAuthState(ctx.orgId, returnTo);
    const authUrl = xeroProvider.getAuthUrl(state, creds);

    return NextResponse.redirect(authUrl);
  } catch (error) {
    return handleApiError(error);
  }
}
