import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { requireAuth, apiSuccess, handleApiError } from "@/lib/api-helpers";
import { createToolSchema } from "@/lib/validations/tool";

export async function GET() {
  try {
    const userId = await requireAuth();

    const [tools, checkouts, maintenance, incidents] = await Promise.all([
      prisma.tool.findMany({ where: { userId }, orderBy: { updatedAt: "desc" } }),
      prisma.toolCheckout.findMany({ where: { userId }, orderBy: { checkedOutAt: "desc" } }),
      prisma.toolMaintenance.findMany({ where: { userId }, orderBy: { date: "desc" } }),
      prisma.toolIncident.findMany({ where: { userId }, orderBy: { date: "desc" } }),
    ]);

    return apiSuccess({ tools, checkouts, maintenance, incidents });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await requireAuth();
    const body = await req.json();
    const data = createToolSchema.parse(body);

    const tool = await prisma.tool.create({
      data: {
        userId,
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
