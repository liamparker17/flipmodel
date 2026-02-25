import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { requireOrgMember, requirePermission, apiSuccess, handleApiError } from "@/lib/api-helpers";
import { parsePagination, paginatedResult } from "@/lib/pagination";
import { createLeaveSchema } from "@/lib/validations/hr";
import { writeAuditLog } from "@/lib/audit";

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireOrgMember();
    const pagination = parsePagination(req);
    const status = req.nextUrl.searchParams.get("status");
    const employeeId = req.nextUrl.searchParams.get("employeeId");

    const where: Record<string, unknown> = { orgId: ctx.orgId };
    if (status) where.status = status;
    if (employeeId) where.employeeId = employeeId;

    const [total, records] = await Promise.all([
      prisma.leaveRecord.count({ where }),
      prisma.leaveRecord.findMany({
        where,
        take: pagination.limit,
        skip: pagination.skip,
        include: { employee: { select: { firstName: true, lastName: true, employeeNumber: true } } },
        orderBy: { startDate: "desc" },
      }),
    ]);

    return apiSuccess(paginatedResult(records, total, pagination));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requirePermission("team:manage");
    const body = await req.json();
    const data = createLeaveSchema.parse(body);

    const record = await prisma.leaveRecord.create({
      data: {
        orgId: ctx.orgId,
        employeeId: data.employeeId,
        leaveType: data.leaveType || "annual",
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        days: data.days || 1,
        reason: data.reason,
        notes: data.notes,
      },
    });

    await writeAuditLog({
      orgId: ctx.orgId,
      userId: ctx.userId,
      action: "create",
      entityType: "leave_record",
      entityId: record.id,
    });

    return apiSuccess(record, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
