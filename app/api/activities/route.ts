import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { requireAuth, apiSuccess, handleApiError } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  try {
    const userId = await requireAuth();
    const dealId = req.nextUrl.searchParams.get("dealId");

    const where: Record<string, unknown> = { userId };
    if (dealId) where.dealId = dealId;

    const activities = await prisma.activity.findMany({
      where,
      orderBy: { timestamp: "desc" },
      take: 50,
    });
    return apiSuccess(activities);
  } catch (error) {
    return handleApiError(error);
  }
}
