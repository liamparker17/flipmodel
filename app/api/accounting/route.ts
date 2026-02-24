import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { requirePermission, apiSuccess, apiError, handleApiError } from "@/lib/api-helpers";
import { z } from "zod";

const connectSchema = z.object({
  provider: z.enum(["quickbooks", "xero", "sage", "manual"]),
  settings: z.any().optional(),
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

    // Check if provider env vars are configured (for UI to show connect buttons)
    const providers = {
      xero: !!(process.env.XERO_CLIENT_ID && process.env.XERO_CLIENT_SECRET),
      quickbooks: !!(process.env.QUICKBOOKS_CLIENT_ID && process.env.QUICKBOOKS_CLIENT_SECRET),
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
        settings: data.settings || {},
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
