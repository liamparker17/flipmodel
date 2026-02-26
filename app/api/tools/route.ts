import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { requireOrgMember, requirePermission, apiSuccess, handleApiError } from "@/lib/api-helpers";
import { parsePagination, paginatedResult } from "@/lib/pagination";
import { createToolSchema } from "@/lib/validations/tool";

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireOrgMember();
    const pagination = parsePagination(req);

    const [tools, total, checkouts, maintenance, incidents] = await Promise.all([
      prisma.tool.findMany({ where: { orgId: ctx.orgId }, orderBy: { updatedAt: "desc" }, take: pagination.limit, skip: pagination.skip }),
      prisma.tool.count({ where: { orgId: ctx.orgId } }),
      prisma.toolCheckout.findMany({ where: { orgId: ctx.orgId }, orderBy: { checkedOutAt: "desc" } }),
      prisma.toolMaintenance.findMany({ where: { orgId: ctx.orgId }, orderBy: { date: "desc" } }),
      prisma.toolIncident.findMany({ where: { orgId: ctx.orgId }, orderBy: { date: "desc" } }),
    ]);

    const response = apiSuccess({ ...paginatedResult(tools, total, pagination), checkouts, maintenance, incidents });
    response.headers.set("Cache-Control", "private, max-age=60, stale-while-revalidate=120");
    return response;
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requirePermission("tools:write");
    const body = await req.json();
    const data = createToolSchema.parse(body);

    const tool = await prisma.tool.create({
      data: {
        orgId: ctx.orgId,
        userId: ctx.userId,
        name: data.name,
        category: data.category,
        brand: data.brand,
        model: data.model,
        serialNumber: data.serialNumber,
        purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null,
        purchaseCost: data.purchaseCost || 0,
        expectedLifespanMonths: data.expectedLifespanMonths || 24,
        replacementCost: data.replacementCost || 0,
        status: data.status || "available",
        condition: data.condition || "new",
        notes: data.notes,
      },
    });

    return apiSuccess(tool, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
