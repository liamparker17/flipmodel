import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { requireAuth, apiSuccess, handleApiError } from "@/lib/api-helpers";

export async function POST(req: NextRequest) {
  try {
    const userId = await requireAuth();
    const body = await req.json();
    const { tools, checkouts, maintenance, incidents } = body as {
      tools: Record<string, unknown>[];
      checkouts: Record<string, unknown>[];
      maintenance: Record<string, unknown>[];
      incidents: Record<string, unknown>[];
    };

    // Create tools
    for (const t of tools || []) {
      await prisma.tool.create({
        data: {
          userId,
          name: t.name as string,
          category: t.category as string,
          brand: t.brand as string | undefined,
          model: t.model as string | undefined,
          serialNumber: t.serialNumber as string | undefined,
          purchaseDate: t.purchaseDate ? new Date(t.purchaseDate as string) : null,
          purchaseCost: (t.purchaseCost as number) || 0,
          expectedLifespanMonths: (t.expectedLifespanMonths as number) || 24,
          replacementCost: (t.replacementCost as number) || 0,
          status: (t.status as string) || "available",
          condition: (t.condition as string) || "new",
          currentHolderType: t.currentHolderType as string | undefined,
          currentHolderId: t.currentHolderId as string | undefined,
          currentHolderName: t.currentHolderName as string | undefined,
          currentDealId: t.currentDealId as string | undefined,
          currentDealName: t.currentDealName as string | undefined,
          notes: t.notes as string | undefined,
        },
      });
    }

    // Create checkouts (needs tool IDs mapped)
    for (const c of checkouts || []) {
      await prisma.toolCheckout.create({
        data: {
          userId,
          toolId: c.toolId as string,
          contractorName: c.contractorName as string,
          contractorId: c.contractorId as string | undefined,
          dealId: c.dealId as string | undefined,
          dealName: c.dealName as string | undefined,
          propertyAddress: c.propertyAddress as string | undefined,
          checkedOutAt: new Date((c.checkedOutAt as string) || new Date().toISOString()),
          expectedReturnDate: c.expectedReturnDate ? new Date(c.expectedReturnDate as string) : null,
          returnedAt: c.returnedAt ? new Date(c.returnedAt as string) : null,
          conditionOut: (c.conditionOut as string) || "good",
          conditionIn: c.conditionIn as string | undefined,
          notes: c.notes as string | undefined,
        },
      });
    }

    // Create maintenance entries
    for (const m of maintenance || []) {
      await prisma.toolMaintenance.create({
        data: {
          userId,
          toolId: m.toolId as string,
          date: new Date((m.date as string) || new Date().toISOString()),
          type: (m.type as string) || "service",
          description: (m.description as string) || "",
          cost: m.cost as number | undefined,
          performedBy: m.performedBy as string | undefined,
          notes: m.notes as string | undefined,
        },
      });
    }

    // Create incidents
    for (const i of incidents || []) {
      await prisma.toolIncident.create({
        data: {
          userId,
          toolId: i.toolId as string,
          date: new Date((i.date as string) || new Date().toISOString()),
          type: (i.type as string) || "lost",
          contractorName: (i.contractorName as string) || "",
          contractorId: i.contractorId as string | undefined,
          dealId: i.dealId as string | undefined,
          dealName: i.dealName as string | undefined,
          description: (i.description as string) || "",
          estimatedCost: i.estimatedCost as number | undefined,
          recoveryStatus: (i.recoveryStatus as string) || "pending",
          recoveryAmount: i.recoveryAmount as number | undefined,
          notes: i.notes as string | undefined,
        },
      });
    }

    return apiSuccess({
      imported: {
        tools: tools?.length || 0,
        checkouts: checkouts?.length || 0,
        maintenance: maintenance?.length || 0,
        incidents: incidents?.length || 0,
      },
    }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
