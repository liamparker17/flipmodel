import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { requireOrgMember, apiSuccess, handleApiError } from "@/lib/api-helpers";
import { parsePagination, paginatedResult } from "@/lib/pagination";

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireOrgMember();
    const pagination = parsePagination(req);
    const dealId = req.nextUrl.searchParams.get("dealId");

    const where: Record<string, unknown> = { orgId: ctx.orgId };
    if (dealId) where.dealId = dealId;

    const total = await prisma.activity.count({ where });
    const activities = await prisma.activity.findMany({
      where,
      orderBy: { timestamp: "desc" },
      take: pagination.limit,
      skip: pagination.skip,
    });
    return apiSuccess(paginatedResult(activities, total, pagination));
  } catch (error) {
    return handleApiError(error);
  }
}
