import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { requirePermission, apiSuccess, apiError, handleApiError } from "@/lib/api-helpers";
import { postJournalEntrySchema } from "@/lib/validations/gl";
import { writeAuditLog } from "@/lib/audit";

type Params = { params: Promise<{ entryId: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const ctx = await requirePermission("accounting:write");
    const { entryId } = await params;
    const body = await req.json().catch(() => ({}));
    postJournalEntrySchema.parse(body);

    const existing = await prisma.journalEntry.findFirst({
      where: { id: entryId, orgId: ctx.orgId },
    });
    if (!existing) return apiError("Journal entry not found", 404);
    if (existing.status !== "draft") return apiError("Only draft entries can be posted", 400);

    const entry = await prisma.journalEntry.update({
      where: { id: entryId },
      data: {
        status: "posted",
        postedAt: new Date(),
        postedBy: ctx.userId,
      },
      include: { lines: true },
    });

    await writeAuditLog({
      orgId: ctx.orgId,
      userId: ctx.userId,
      action: "post",
      entityType: "JournalEntry",
      entityId: entryId,
      metadata: { entryNumber: existing.entryNumber },
    });

    return apiSuccess(entry);
  } catch (error) {
    return handleApiError(error);
  }
}
