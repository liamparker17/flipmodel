import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { requireOrgMember, apiSuccess, handleApiError } from "@/lib/api-helpers";
import { parsePagination, paginatedResult } from "@/lib/pagination";

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireOrgMember();
    const pagination = parsePagination(req);
    const unreadOnly = req.nextUrl.searchParams.get("unread") === "true";

    const where: Record<string, unknown> = { userId: ctx.userId, orgId: ctx.orgId };
    if (unreadOnly) where.read = false;

    const total = await prisma.notification.count({ where });
    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: pagination.skip,
      take: pagination.limit,
    });

    return apiSuccess(paginatedResult(notifications, total, pagination));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireOrgMember();
    const body = await req.json();

    if (body.action === "markRead") {
      const ids = body.ids as string[];
      await prisma.notification.updateMany({
        where: { id: { in: ids }, userId: ctx.userId, orgId: ctx.orgId },
        data: { read: true },
      });
      return apiSuccess({ updated: ids.length });
    }

    if (body.action === "markAllRead") {
      const result = await prisma.notification.updateMany({
        where: { userId: ctx.userId, orgId: ctx.orgId, read: false },
        data: { read: true },
      });
      return apiSuccess({ updated: result.count });
    }

    return apiSuccess({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
