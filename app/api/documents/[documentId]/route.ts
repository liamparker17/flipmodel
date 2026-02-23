import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { requirePermission, apiSuccess, apiError, handleApiError } from "@/lib/api-helpers";

type Params = { params: Promise<{ documentId: string }> };

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const ctx = await requirePermission("documents:write");
    const { documentId } = await params;

    const existing = await prisma.document.findFirst({ where: { id: documentId, orgId: ctx.orgId } });
    if (!existing) return apiError("Document not found", 404);

    await prisma.document.delete({ where: { id: documentId } });
    return apiSuccess({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
