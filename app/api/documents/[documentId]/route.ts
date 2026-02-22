import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { requireAuth, apiSuccess, apiError, handleApiError } from "@/lib/api-helpers";

type Params = { params: Promise<{ documentId: string }> };

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const userId = await requireAuth();
    const { documentId } = await params;

    const existing = await prisma.document.findFirst({ where: { id: documentId, userId } });
    if (!existing) return apiError("Document not found", 404);

    await prisma.document.delete({ where: { id: documentId } });
    return apiSuccess({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
