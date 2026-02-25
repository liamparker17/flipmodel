import { NextRequest } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { requireOrgMember, requirePermission, apiSuccess, handleApiError } from "@/lib/api-helpers";
import { parsePagination, paginatedResult } from "@/lib/pagination";
import { writeAuditLog } from "@/lib/audit";

const createFinancialPeriodSchema = z.object({
  name: z.string().min(1),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
});

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireOrgMember();
    const pagination = parsePagination(req);

    const where = { orgId: ctx.orgId };
    const total = await prisma.financialPeriod.count({ where });
    const periods = await prisma.financialPeriod.findMany({
      where,
      orderBy: { startDate: "desc" },
      take: pagination.limit,
      skip: pagination.skip,
    });

    return apiSuccess(paginatedResult(periods, total, pagination));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requirePermission("accounting:write");
    const body = await req.json();
    const data = createFinancialPeriodSchema.parse(body);

    const period = await prisma.financialPeriod.create({
      data: {
        orgId: ctx.orgId,
        name: data.name,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
      },
    });

    await writeAuditLog({
      orgId: ctx.orgId,
      userId: ctx.userId,
      action: "create",
      entityType: "FinancialPeriod",
      entityId: period.id,
      metadata: { name: data.name },
    });

    return apiSuccess(period, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
