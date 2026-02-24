import { NextRequest, NextResponse } from "next/server";
import { requirePermission, handleApiError } from "@/lib/api-helpers";
import { quickbooksProvider, setQuickBooksCredentials } from "@/lib/accounting/quickbooks";
import { generateOAuthState, storeOAuthState } from "@/lib/accounting/providers";
import { getCredentials } from "@/lib/accounting/credentials";
import prisma from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const ctx = await requirePermission("accounting:write");

    // Inject DB credentials if available
    const creds = await getCredentials("quickbooks", ctx.orgId);
    if (creds) setQuickBooksCredentials(creds.clientId, creds.clientSecret, creds.sandbox);

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
    const returnTo = new URL(req.url).searchParams.get("returnTo") || "";

    // Generate state with org context and optional returnTo embedded
    const state = `${ctx.orgId}:${generateOAuthState()}:${returnTo}`;
    storeOAuthState(state);
    const authUrl = quickbooksProvider.getAuthUrl(state);

    return NextResponse.redirect(authUrl);
  } catch (error) {
    return handleApiError(error);
  }
}
