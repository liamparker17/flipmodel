import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { requireAuth, apiSuccess, handleApiError } from "@/lib/api-helpers";

export async function POST(req: NextRequest) {
  try {
    const userId = await requireAuth();
    const body = await req.json();
    const deals = body.deals as Record<string, unknown>[];

    const results = [];

    for (const deal of deals) {
      const created = await prisma.deal.create({
        data: {
          userId,
          name: (deal.name as string) || "Imported Deal",
          address: (deal.address as string) || "",
          purchasePrice: (deal.purchasePrice as number) || 0,
          expectedSalePrice: (deal.expectedSalePrice as number) || 0,
          actualSalePrice: deal.actualSalePrice as number | undefined,
          stage: (deal.stage as string) || "lead",
          priority: (deal.priority as string) || "medium",
          notes: (deal.notes as string) || "",
          tags: (deal.tags as string[]) || [],
          data: deal.data || {},
          offerAmount: deal.offerAmount as number | undefined,
          offerDate: deal.offerDate ? new Date(deal.offerDate as string) : null,
          purchaseDate: deal.purchaseDate ? new Date(deal.purchaseDate as string) : null,
          transferDate: deal.transferDate ? new Date(deal.transferDate as string) : null,
          listedDate: deal.listedDate ? new Date(deal.listedDate as string) : null,
          soldDate: deal.soldDate ? new Date(deal.soldDate as string) : null,
          actualSaleDate: deal.actualSaleDate ? new Date(deal.actualSaleDate as string) : null,
          expenses: {
            create: ((deal.expenses as Record<string, unknown>[]) || []).map((e) => ({
              user: { connect: { id: userId } },
              category: (e.category as string) || "other",
              description: (e.description as string) || "",
              amount: (e.amount as number) || 0,
              date: new Date((e.date as string) || new Date().toISOString()),
              vendor: (e.vendor as string) || "",
              paymentMethod: (e.paymentMethod as string) || "eft",
              receiptRef: e.receiptRef as string | undefined,
              notes: e.notes as string | undefined,
              isProjected: (e.isProjected as boolean) || false,
            })),
          },
          milestones: {
            create: ((deal.milestones as Record<string, unknown>[]) || []).map((m) => ({
              user: { connect: { id: userId } },
              title: (m.title as string) || "",
              description: (m.description as string) || "",
              dueDate: m.dueDate ? new Date(m.dueDate as string) : null,
              completedDate: m.completedDate ? new Date(m.completedDate as string) : null,
              status: (m.status as string) || "pending",
              order: (m.order as number) || 0,
              tasks: {
                create: ((m.tasks as Record<string, unknown>[]) || []).map((t) => ({
                  title: (t.title as string) || "",
                  completed: (t.completed as boolean) || false,
                  assignedTo: t.assignedTo as string | undefined,
                })),
              },
            })),
          },
          activities: {
            create: ((deal.activities as Record<string, unknown>[]) || []).map((a) => ({
              user: { connect: { id: userId } },
              type: (a.type as string) || "deal_created",
              description: (a.description as string) || "",
              timestamp: new Date((a.timestamp as string) || new Date().toISOString()),
              metadata: (a.metadata as any) || undefined,
            })),
          },
        },
      });
      results.push(created);
    }

    return apiSuccess({ imported: results.length }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
