import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { requireAuth, apiSuccess, handleApiError } from "@/lib/api-helpers";
import { createContactSchema } from "@/lib/validations/contact";

export async function GET(req: NextRequest) {
  try {
    const userId = await requireAuth();
    const role = req.nextUrl.searchParams.get("role");

    const where: Record<string, unknown> = { userId };
    if (role) where.role = role;

    const contacts = await prisma.contact.findMany({
      where,
      include: { dealContacts: { include: { deal: { select: { id: true, name: true } } } } },
      orderBy: { name: "asc" },
    });
    return apiSuccess(contacts);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await requireAuth();
    const body = await req.json();
    const data = createContactSchema.parse(body);

    const contact = await prisma.contact.create({
      data: {
        userId,
        name: data.name,
        role: data.role || "other",
        company: data.company,
        phone: data.phone,
        email: data.email || null,
        notes: data.notes,
        profession: data.profession,
        dailyRate: data.dailyRate,
        bankName: data.bankName,
        accountNumber: data.accountNumber,
        branchCode: data.branchCode,
        accountType: data.accountType,
      },
    });

    return apiSuccess(contact, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
