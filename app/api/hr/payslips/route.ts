import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { requireOrgMember, requirePermission, apiSuccess, handleApiError } from "@/lib/api-helpers";
import { parsePagination, paginatedResult } from "@/lib/pagination";
import { createPayslipSchema } from "@/lib/validations/hr";
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

    const [total, payslips] = await Promise.all([
      prisma.payslip.count({ where }),
      prisma.payslip.findMany({
        where,
        take: pagination.limit,
        skip: pagination.skip,
        include: { employee: { select: { firstName: true, lastName: true, employeeNumber: true } } },
        orderBy: { periodStart: "desc" },
      }),
    ]);

    return apiSuccess(paginatedResult(payslips, total, pagination));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requirePermission("team:manage");
    const body = await req.json();
    const data = createPayslipSchema.parse(body);

    // Calculate gross, deductions, net
    const grossPay = data.basePay + (data.overtime || 0) + (data.bonus || 0) + (data.commission || 0);
    const totalDeductions = (data.paye || 0) + (data.uif || 0) + (data.pensionFund || 0) + (data.medicalAid || 0) + (data.otherDeductions || 0);
    const netPay = grossPay - totalDeductions;

    const payslip = await prisma.payslip.create({
      data: {
        orgId: ctx.orgId,
        employeeId: data.employeeId,
        periodStart: new Date(data.periodStart),
        periodEnd: new Date(data.periodEnd),
        basePay: data.basePay,
        overtime: data.overtime || 0,
        bonus: data.bonus || 0,
        commission: data.commission || 0,
        grossPay,
        paye: data.paye || 0,
        uif: data.uif || 0,
        pensionFund: data.pensionFund || 0,
        medicalAid: data.medicalAid || 0,
        otherDeductions: data.otherDeductions || 0,
        totalDeductions,
        netPay,
        notes: data.notes,
      },
    });

    await writeAuditLog({
      orgId: ctx.orgId,
      userId: ctx.userId,
      action: "create",
      entityType: "payslip",
      entityId: payslip.id,
    });

    return apiSuccess(payslip, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
