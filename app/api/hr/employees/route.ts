import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { requireOrgMember, requirePermission, apiSuccess, handleApiError } from "@/lib/api-helpers";
import { parsePagination, paginatedResult } from "@/lib/pagination";
import { createEmployeeSchema } from "@/lib/validations/hr";
import { writeAuditLog } from "@/lib/audit";
import { encryptSensitiveFields } from "@/lib/field-encryption";

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireOrgMember();
    const pagination = parsePagination(req);
    const status = req.nextUrl.searchParams.get("status");
    const department = req.nextUrl.searchParams.get("department");

    const where: Record<string, unknown> = { orgId: ctx.orgId };
    if (status) where.status = status;
    if (department) where.department = department;

    const [total, employees] = await Promise.all([
      prisma.employee.count({ where }),
      prisma.employee.findMany({
        where,
        take: pagination.limit,
        skip: pagination.skip,
        orderBy: { lastName: "asc" },
      }),
    ]);

    return apiSuccess(paginatedResult(employees, total, pagination));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requirePermission("team:manage");
    const body = await req.json();
    const data = createEmployeeSchema.parse(body);

    const secureData = encryptSensitiveFields(data as Record<string, unknown>);

    const employee = await prisma.employee.create({
      data: {
        orgId: ctx.orgId,
        employeeNumber: data.employeeNumber,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email || null,
        phone: data.phone,
        idNumber: secureData.idNumber as string | undefined,
        taxNumber: data.taxNumber,
        position: data.position || "",
        department: data.department,
        employmentType: data.employmentType || "full_time",
        startDate: new Date(data.startDate),
        baseSalary: data.baseSalary || 0,
        hourlyRate: data.hourlyRate,
        bankName: data.bankName,
        accountNumber: secureData.accountNumber as string | undefined,
        branchCode: secureData.branchCode as string | undefined,
        contactId: data.contactId,
        notes: data.notes,
      },
    });

    await writeAuditLog({
      orgId: ctx.orgId,
      userId: ctx.userId,
      action: "create",
      entityType: "employee",
      entityId: employee.id,
    });

    return apiSuccess(employee, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
