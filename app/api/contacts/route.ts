import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { requireOrgMember, requirePermission, apiSuccess, handleApiError } from "@/lib/api-helpers";
import { parsePagination, paginatedResult } from "@/lib/pagination";
import { createContactSchema } from "@/lib/validations/contact";
import { encryptSensitiveFields } from "@/lib/field-encryption";

export async function GET(req: NextRequest) {
  try {
    const ctx = await requirePermission("contacts:read");
    const role = req.nextUrl.searchParams.get("role");

    const pagination = parsePagination(req);
    const where: Record<string, unknown> = { orgId: ctx.orgId };
    if (role) where.role = role;

    const total = await prisma.contact.count({ where });
    const contacts = await prisma.contact.findMany({
      where,
      include: { dealContacts: { include: { deal: { select: { id: true, name: true } } } } },
      orderBy: { name: "asc" },
      take: pagination.limit,
      skip: pagination.skip,
    });
    const response = apiSuccess(paginatedResult(contacts, total, pagination));
    response.headers.set("Cache-Control", "private, max-age=60, stale-while-revalidate=120");
    return response;
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requirePermission("contacts:write");
    const body = await req.json();
    const data = createContactSchema.parse(body);
    const secureData = encryptSensitiveFields(data as Record<string, unknown>);

    const contact = await prisma.contact.create({
      data: {
        orgId: ctx.orgId,
        userId: ctx.userId,
        name: data.name,
        role: data.role || "other",
        company: data.company,
        phone: data.phone,
        email: data.email || null,
        notes: data.notes,
        profession: data.profession,
        dailyRate: data.dailyRate,
        bankName: data.bankName,
        accountNumber: secureData.accountNumber as string | undefined,
        branchCode: secureData.branchCode as string | undefined,
        accountType: data.accountType,
      },
    });

    return apiSuccess(contact, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
