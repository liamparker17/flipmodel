import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { requirePermission, apiSuccess, apiError, handleApiError } from "@/lib/api-helpers";
import { hasCredentials } from "@/lib/accounting/credentials";
import { z } from "zod";

const connectSchema = z.object({
  provider: z.enum(["quickbooks", "xero", "sage", "manual"]),
  settings: z.record(z.string(), z.unknown()).optional(),
});

export async function GET() {
  try {
    const ctx = await requirePermission("accounting:read");

    const connection = await prisma.accountingConnection.findFirst({
      where: { orgId: ctx.orgId },
      select: {
        id: true,
        provider: true,
        status: true,
        externalOrgId: true,
        lastSyncAt: true,
        settings: true,
        createdAt: true,
      },
    });

    // Check if provider credentials are available (from DB or env vars)
    const [xeroAvailable, quickbooksAvailable] = await Promise.all([
      hasCredentials("xero", ctx.orgId),
      hasCredentials("quickbooks", ctx.orgId),
    ]);

    const providers = {
      xero: xeroAvailable,
      quickbooks: quickbooksAvailable,
    };

    return apiSuccess({ connection, providers });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requirePermission("accounting:write");
    const body = await req.json();
    const data = connectSchema.parse(body);

    // Check for existing connection
    const existing = await prisma.accountingConnection.findFirst({
      where: { orgId: ctx.orgId },
    });
    if (existing) {
      return apiError("An accounting connection already exists. Disconnect first.", 400);
    }

    const connection = await prisma.accountingConnection.create({
      data: {
        orgId: ctx.orgId,
        provider: data.provider,
        status: data.provider === "manual" ? "connected" : "disconnected",
        settings: (data.settings || {}) as Record<string, string>,
      },
    });

    return apiSuccess(connection, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE() {
  try {
    const ctx = await requirePermission("accounting:write");

    const existing = await prisma.accountingConnection.findFirst({
      where: { orgId: ctx.orgId },
    });
    if (!existing) return apiError("No connection found", 404);

    // Clean up sync records
    await prisma.accountingSync.deleteMany({ where: { orgId: ctx.orgId } });
    await prisma.accountingConnection.delete({ where: { id: existing.id } });
    return apiSuccess({ disconnected: true });
  } catch (error) {
    return handleApiError(error);
  }
}
