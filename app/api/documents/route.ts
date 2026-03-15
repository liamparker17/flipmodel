import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { requireOrgMember, requirePermission, apiSuccess, handleApiError } from "@/lib/api-helpers";
import { parsePagination, paginatedResult } from "@/lib/pagination";
import { createDocumentSchema } from "@/lib/validations/document";

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireOrgMember();
    const dealId = req.nextUrl.searchParams.get("dealId");

    const pagination = parsePagination(req);
    const where: Record<string, unknown> = { orgId: ctx.orgId };
    if (dealId) where.dealId = dealId;

    const total = await prisma.document.count({ where });
    const documents = await prisma.document.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: pagination.limit,
      skip: pagination.skip,
    });
    return apiSuccess(paginatedResult(documents, total, pagination));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requirePermission("documents:write");
    const body = await req.json();
    const data = createDocumentSchema.parse(body);

    const document = await prisma.document.create({
      data: {
        orgId: ctx.orgId,
        userId: ctx.userId,
        dealId: data.dealId,
        name: data.name,
        type: data.type,
        url: data.url,
        notes: data.notes,
      },
    });

    return apiSuccess(document, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
