import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { requireOrgMember, apiSuccess, handleApiError } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireOrgMember();
    const page = parseInt(req.nextUrl.searchParams.get("page") || "1");
    const limit = parseInt(req.nextUrl.searchParams.get("limit") || "20");
    const unreadOnly = req.nextUrl.searchParams.get("unread") === "true";

    const where: Record<string, unknown> = { userId: ctx.userId, orgId: ctx.orgId };
    if (unreadOnly) where.read = false;

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.notification.count({ where }),
    ]);

    return apiSuccess({ notifications, total, page, limit });
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
