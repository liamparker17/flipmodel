import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { requireAuth, apiSuccess, handleApiError } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  try {
    const userId = await requireAuth();
    const q = req.nextUrl.searchParams.get("q") || "";
    if (q.length < 2) return apiSuccess({ deals: [], contacts: [], tools: [] });

    const [deals, contacts, tools] = await Promise.all([
      prisma.deal.findMany({
        where: {
          userId,
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { address: { contains: q, mode: "insensitive" } },
          ],
        },
        select: { id: true, name: true, address: true, stage: true },
        take: 10,
      }),
      prisma.contact.findMany({
        where: {
          userId,
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { company: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
          ],
        },
        select: { id: true, name: true, role: true, company: true },
        take: 10,
      }),
      prisma.tool.findMany({
        where: {
          userId,
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { brand: { contains: q, mode: "insensitive" } },
            { serialNumber: { contains: q, mode: "insensitive" } },
          ],
        },
        select: { id: true, name: true, category: true, status: true },
        take: 10,
      }),
    ]);

    return apiSuccess({ deals, contacts, tools });
  } catch (error) {
    return handleApiError(error);
  }
}
