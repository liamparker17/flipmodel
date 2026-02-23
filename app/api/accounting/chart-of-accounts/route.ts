import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { requirePermission, apiSuccess, apiError, handleApiError } from "@/lib/api-helpers";
import { DEFAULT_CHART_OF_ACCOUNTS } from "@/types/accounting";

export async function GET() {
  try {
    const ctx = await requirePermission("accounting:read");

    const accounts = await prisma.chartOfAccount.findMany({
      where: { orgId: ctx.orgId },
      orderBy: { code: "asc" },
    });

    return apiSuccess(accounts);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requirePermission("accounting:write");
    const body = await req.json();

    // Seed defaults
    if (body.action === "seedDefaults") {
      const existing = await prisma.chartOfAccount.count({ where: { orgId: ctx.orgId } });
      if (existing > 0) {
        return apiError("Chart of accounts already has entries. Clear them first.", 400);
      }

      const created = await prisma.$transaction(
        DEFAULT_CHART_OF_ACCOUNTS.map((acct) =>
          prisma.chartOfAccount.create({
            data: {
              orgId: ctx.orgId,
              code: acct.code,
              name: acct.name,
              type: acct.type,
              subtype: acct.subtype,
              isSystemAccount: true,
              isActive: true,
            },
          })
        )
      );

      return apiSuccess({ seeded: created.length }, 201);
    }

    // Create single account
    const account = await prisma.chartOfAccount.create({
      data: {
        orgId: ctx.orgId,
        code: body.code,
        name: body.name,
        type: body.type,
        subtype: body.subtype,
        parentId: body.parentId || null,
        isActive: true,
        isSystemAccount: false,
      },
    });

    return apiSuccess(account, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
