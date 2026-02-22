import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { requireAuth, apiSuccess, apiError, handleApiError } from "@/lib/api-helpers";
import { updateContactSchema } from "@/lib/validations/contact";

type Params = { params: Promise<{ contactId: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const userId = await requireAuth();
    const { contactId } = await params;
    const body = await req.json();
    const data = updateContactSchema.parse(body);

    const existing = await prisma.contact.findFirst({ where: { id: contactId, userId } });
    if (!existing) return apiError("Contact not found", 404);

    const contact = await prisma.contact.update({
      where: { id: contactId },
      data,
    });

    return apiSuccess(contact);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const userId = await requireAuth();
    const { contactId } = await params;

    const existing = await prisma.contact.findFirst({ where: { id: contactId, userId } });
    if (!existing) return apiError("Contact not found", 404);

    await prisma.contact.delete({ where: { id: contactId } });
    return apiSuccess({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
