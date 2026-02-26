import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { requireOrgMember, requirePermission, apiSuccess, handleApiError } from "@/lib/api-helpers";
import { parsePagination, paginatedResult } from "@/lib/pagination";
import { createDealSchema } from "@/lib/validations/deal";

import { seed } from "../../prisma/seed";

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireOrgMember();
    // ensure demo data is up to date (runs on every call, including production)
    // seed() handles idempotency by upserting known demo records
    seed().catch((e) => console.warn("demo seed failed", e));
    const pagination = parsePagination(req);
    const total = await prisma.deal.count({ where: { orgId: ctx.orgId } });
    const deals = await prisma.deal.findMany({
      where: { orgId: ctx.orgId },
      take: pagination.limit,
      skip: pagination.skip,
      select: {
        id: true,
        name: true,
        address: true,
        stage: true,
        priority: true,
        tags: true,
        purchasePrice: true,
        expectedSalePrice: true,
        data: true,
        updatedAt: true,
        createdAt: true,
        orgId: true,
        userId: true,
        _count: {
          select: {
            expenses: true,
            milestones: true,
            documents: true,
          },
        },
        dealContacts: {
          select: {
            id: true,
            daysWorked: true,
            workDescription: true,
            contact: {
              select: {
                id: true,
                name: true,
                role: true,
                company: true,
                phone: true,
                email: true,
                profession: true,
                dailyRate: true,
                notes: true,
                bankName: true,
                accountNumber: true,
                branchCode: true,
                accountType: true,
              },
            },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });
    const response = apiSuccess(paginatedResult(deals, total, pagination));
    response.headers.set("Cache-Control", "private, max-age=15, stale-while-revalidate=30");
    return response;
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requirePermission("deals:write");
    const body = await req.json();
    const data = createDealSchema.parse(body);

    const deal = await prisma.deal.create({
      data: {
        orgId: ctx.orgId,
        userId: ctx.userId,
        name: data.name,
        address: data.address || "",
        purchasePrice: data.purchasePrice || 0,
        expectedSalePrice: data.expectedSalePrice || 0,
        stage: data.stage || "lead",
        priority: data.priority || "medium",
        notes: data.notes || "",
        tags: data.tags || [],
        data: data.data || getDefaultDealData(),
      },
      include: {
        expenses: true,
        milestones: { include: { tasks: true } },
        activities: true,
        dealContacts: { include: { contact: true } },
        documents: true,
        shoppingListItems: true,
      },
    });

    return apiSuccess(deal, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

function getDefaultDealData() {
  return {
    mode: "quick",
    acq: {
      purchasePrice: 1200000, deposit: 0, bondRate: 12.75, bondTerm: 240,
      cashPurchase: false, transferAttorneyFees: 45000, bondRegistration: 25000, initialRepairs: 0,
    },
    prop: { totalSqm: 180, erfSize: 600, bedrooms: 3, bathrooms: 2, garages: 1, stories: "single" },
    rooms: [], nextRoomId: 0, contractors: [],
    costDb: {}, contingencyPct: 10, pmPct: 8,
    holding: { renovationMonths: 4, ratesAndTaxes: 1800, utilities: 1200, insurance: 950, security: 2500, levies: 0 },
    resale: { expectedPrice: 2800000, areaBenchmarkPsqm: 18000, agentCommission: 5 },
    quickRenoEstimate: 500000,
  };
}
