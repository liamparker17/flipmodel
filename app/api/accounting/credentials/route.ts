import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { requirePermission, apiSuccess, apiError, handleApiError } from "@/lib/api-helpers";
import { encryptCredentials } from "@/lib/accounting/credentials";
import { z } from "zod";

const credentialsSchema = z.object({
  xeroClientId: z.string().optional(),
  xeroClientSecret: z.string().optional(),
  quickbooksClientId: z.string().optional(),
  quickbooksClientSecret: z.string().optional(),
  quickbooksSandbox: z.boolean().optional(),
});

// GET — return which providers have credentials saved (never return the actual secrets)
export async function GET() {
  try {
    const ctx = await requirePermission("accounting:read");

    const org = await prisma.organisation.findUnique({
      where: { id: ctx.orgId },
      select: { settings: true },
    });

    const settings = (org?.settings as Record<string, unknown>) || {};
    const creds = (settings.accountingCredentials as Record<string, string>) || {};

    // Only return booleans — never expose any part of the credentials
    return apiSuccess({
      xero: {
        configured: !!(creds.xeroClientId && creds.xeroClientSecret),
      },
      quickbooks: {
        configured: !!(creds.quickbooksClientId && creds.quickbooksClientSecret),
        sandbox: creds.quickbooksSandbox === "true",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST — save accounting API credentials (encrypted at rest)
export async function POST(req: NextRequest) {
  try {
    const ctx = await requirePermission("accounting:write");
    const body = await req.json();
    const data = credentialsSchema.parse(body);

    // Only executives can manage API credentials
    if (ctx.member.role !== "executive") {
      return apiError("Only executives can manage API credentials", 403);
    }

    const org = await prisma.organisation.findUnique({
      where: { id: ctx.orgId },
      select: { settings: true },
    });

    const existingSettings = (org?.settings as Record<string, unknown>) || {};
    const existingCreds = (existingSettings.accountingCredentials as Record<string, string>) || {};

    // Merge — only update fields that are provided (don't wipe others)
    // Encrypt secrets before storage
    const updatedCreds: Record<string, string> = { ...existingCreds };
    if (data.xeroClientId !== undefined) updatedCreds.xeroClientId = encryptCredentials(data.xeroClientId);
    if (data.xeroClientSecret !== undefined) updatedCreds.xeroClientSecret = encryptCredentials(data.xeroClientSecret);
    if (data.quickbooksClientId !== undefined) updatedCreds.quickbooksClientId = encryptCredentials(data.quickbooksClientId);
    if (data.quickbooksClientSecret !== undefined) updatedCreds.quickbooksClientSecret = encryptCredentials(data.quickbooksClientSecret);
    if (data.quickbooksSandbox !== undefined) updatedCreds.quickbooksSandbox = String(data.quickbooksSandbox);

    await prisma.organisation.update({
      where: { id: ctx.orgId },
      data: {
        settings: {
          ...existingSettings,
          accountingCredentials: updatedCreds,
        },
      },
    });

    console.log(`[AUDIT] Credentials saved for org=${ctx.orgId} by user=${ctx.userId} provider=${data.xeroClientId ? "xero" : "quickbooks"}`);

    return apiSuccess({ saved: true });
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE — remove all stored credentials for a provider
export async function DELETE(req: NextRequest) {
  try {
    const ctx = await requirePermission("accounting:write");

    if (ctx.member.role !== "executive") {
      return apiError("Only executives can manage API credentials", 403);
    }

    const { searchParams } = new URL(req.url);
    const provider = searchParams.get("provider"); // "xero" or "quickbooks"

    const org = await prisma.organisation.findUnique({
      where: { id: ctx.orgId },
      select: { settings: true },
    });

    const existingSettings = (org?.settings as Record<string, unknown>) || {};
    const existingCreds = (existingSettings.accountingCredentials as Record<string, string>) || {};

    if (provider === "xero") {
      delete existingCreds.xeroClientId;
      delete existingCreds.xeroClientSecret;
    } else if (provider === "quickbooks") {
      delete existingCreds.quickbooksClientId;
      delete existingCreds.quickbooksClientSecret;
      delete existingCreds.quickbooksSandbox;
    }

    await prisma.organisation.update({
      where: { id: ctx.orgId },
      data: {
        settings: {
          ...existingSettings,
          accountingCredentials: existingCreds,
        },
      },
    });

    console.log(`[AUDIT] Credentials removed for org=${ctx.orgId} by user=${ctx.userId} provider=${provider}`);

    return apiSuccess({ removed: provider });
  } catch (error) {
    return handleApiError(error);
  }
}
