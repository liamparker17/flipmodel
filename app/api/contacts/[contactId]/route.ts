import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { requirePermission, apiSuccess, apiError, handleApiError } from "@/lib/api-helpers";
import { updateContactSchema } from "@/lib/validations/contact";
import { writeAuditLog } from "@/lib/audit";
import { encryptSensitiveFields, decryptSensitiveFields } from "@/lib/field-encryption";

type Params = { params: Promise<{ contactId: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const ctx = await requirePermission("contacts:write");
    const { contactId } = await params;
    const body = await req.json();
    const data = updateContactSchema.parse(body);

    const existing = await prisma.contact.findFirst({ where: { id: contactId, orgId: ctx.orgId } });
    if (!existing) return apiError("Contact not found", 404);

    const secureData = encryptSensitiveFields(data as Record<string, unknown>);

    const contact = await prisma.contact.update({
      where: { id: contactId },
      data: secureData,
    });

    await writeAuditLog({ orgId: ctx.orgId, userId: ctx.userId, action: "update", entityType: "Contact", entityId: contactId });

    return apiSuccess(contact);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const ctx = await requirePermission("contacts:write");
    const { contactId } = await params;

    const existing = await prisma.contact.findFirst({ where: { id: contactId, orgId: ctx.orgId } });
    if (!existing) return apiError("Contact not found", 404);

    await prisma.contact.delete({ where: { id: contactId } });

    await writeAuditLog({ orgId: ctx.orgId, userId: ctx.userId, action: "delete", entityType: "Contact", entityId: contactId });

    return apiSuccess({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
