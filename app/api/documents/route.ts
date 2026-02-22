import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { requireAuth, apiSuccess, handleApiError } from "@/lib/api-helpers";
import { z } from "zod";

const createDocumentSchema = z.object({
  dealId: z.string().optional(),
  name: z.string().min(1),
  type: z.string().min(1),
  url: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const userId = await requireAuth();
    const dealId = req.nextUrl.searchParams.get("dealId");

    const where: Record<string, unknown> = { userId };
    if (dealId) where.dealId = dealId;

    const documents = await prisma.document.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
    return apiSuccess(documents);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await requireAuth();
    const body = await req.json();
    const data = createDocumentSchema.parse(body);

    const document = await prisma.document.create({
      data: {
        userId,
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
