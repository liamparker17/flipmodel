import { NextRequest } from "next/server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/db";
import { requirePermission, apiSuccess, apiError, handleApiError } from "@/lib/api-helpers";
import { DEFAULT_CHART_OF_ACCOUNTS } from "@/types/accounting";

const seedDefaultsSchema = z.object({
  action: z.literal("seedDefaults"),
});

const createAccountSchema = z.object({
  action: z.undefined().or(z.string().max(0)).optional(),
  code: z.string().min(1, "Account code is required").max(20),
  name: z.string().min(1, "Account name is required").max(200),
  type: z.enum(["asset", "liability", "equity", "revenue", "expense"]),
  subtype: z.string().min(1, "Subtype is required").max(100),
  parentId: z.string().optional(),
});

export async function GET() {
  try {
    const ctx = await requirePermission("accounting:read");

    const accounts = await prisma.chartOfAccount.findMany({
      where: { orgId: ctx.orgId },
      orderBy: { code: "asc" },
    });

    const response = apiSuccess(accounts);
    response.headers.set("Cache-Control", "private, max-age=300, stale-while-revalidate=600");
    return response;
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requirePermission("accounting:write");
    const body = await req.json();

    // Seed defaults
    if ((body as { action?: string }).action === "seedDefaults") {
      seedDefaultsSchema.parse(body);
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

      revalidatePath("/api/accounting/chart-of-accounts");
      return apiSuccess({ seeded: created.length }, 201);
    }

    // Create single account
    const data = createAccountSchema.parse(body);
    const account = await prisma.chartOfAccount.create({
      data: {
        orgId: ctx.orgId,
        code: data.code,
        name: data.name,
        type: data.type,
        subtype: data.subtype,
        parentId: data.parentId || null,
        isActive: true,
        isSystemAccount: false,
      },
    });

    revalidatePath("/api/accounting/chart-of-accounts");
    return apiSuccess(account, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
