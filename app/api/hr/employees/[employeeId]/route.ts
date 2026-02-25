import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { requireOrgMember, requirePermission, apiSuccess, apiError, handleApiError } from "@/lib/api-helpers";
import { updateEmployeeSchema } from "@/lib/validations/hr";
import { writeAuditLog, diffChanges } from "@/lib/audit";
import { encryptSensitiveFields } from "@/lib/field-encryption";

type Params = { params: Promise<{ employeeId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const ctx = await requireOrgMember();
    const { employeeId } = await params;

    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, orgId: ctx.orgId },
      include: {
        leaveRecords: { orderBy: { startDate: "desc" }, take: 20 },
        payslips: { orderBy: { periodStart: "desc" }, take: 12 },
      },
    });

    if (!employee) return apiError("Employee not found", 404);
    return apiSuccess(employee);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const ctx = await requirePermission("team:manage");
    const { employeeId } = await params;
    const body = await req.json();
    const data = updateEmployeeSchema.parse(body);

    const existing = await prisma.employee.findFirst({
      where: { id: employeeId, orgId: ctx.orgId },
    });
    if (!existing) return apiError("Employee not found", 404);

    const secureData = encryptSensitiveFields(data as Record<string, unknown>);

    const updateData: Record<string, unknown> = {};
    if (data.firstName !== undefined) updateData.firstName = data.firstName;
    if (data.lastName !== undefined) updateData.lastName = data.lastName;
    if (data.email !== undefined) updateData.email = data.email || null;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.idNumber !== undefined) updateData.idNumber = secureData.idNumber;
    if (data.taxNumber !== undefined) updateData.taxNumber = data.taxNumber;
    if (data.position !== undefined) updateData.position = data.position;
    if (data.department !== undefined) updateData.department = data.department;
    if (data.employmentType !== undefined) updateData.employmentType = data.employmentType;
    if (data.startDate !== undefined) updateData.startDate = new Date(data.startDate);
    if (data.baseSalary !== undefined) updateData.baseSalary = data.baseSalary;
    if (data.hourlyRate !== undefined) updateData.hourlyRate = data.hourlyRate;
    if (data.bankName !== undefined) updateData.bankName = data.bankName;
    if (data.accountNumber !== undefined) updateData.accountNumber = secureData.accountNumber;
    if (data.branchCode !== undefined) updateData.branchCode = secureData.branchCode;
    if (data.notes !== undefined) updateData.notes = data.notes;

    const employee = await prisma.employee.update({
      where: { id: employeeId },
      data: updateData,
    });

    const changes = diffChanges(
      existing as unknown as Record<string, unknown>,
      updateData,
      ["firstName", "lastName", "position", "department", "status", "baseSalary"]
    );

    await writeAuditLog({
      orgId: ctx.orgId,
      userId: ctx.userId,
      action: "update",
      entityType: "employee",
      entityId: employeeId,
      changes,
    });

    return apiSuccess(employee);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const ctx = await requirePermission("team:manage");
    const { employeeId } = await params;

    const existing = await prisma.employee.findFirst({
      where: { id: employeeId, orgId: ctx.orgId },
    });
    if (!existing) return apiError("Employee not found", 404);

    await prisma.employee.delete({ where: { id: employeeId } });

    await writeAuditLog({
      orgId: ctx.orgId,
      userId: ctx.userId,
      action: "delete",
      entityType: "employee",
      entityId: employeeId,
    });

    return apiSuccess({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
