import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { requireOrgMember, requirePermission, apiSuccess, apiError, handleApiError } from "@/lib/api-helpers";
import { z } from "zod";

const createDepartmentSchema = z.object({
  name: z.string().min(1).max(100),
  parentId: z.string().nullable().optional(),
});

const updateDepartmentSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(100).optional(),
  parentId: z.string().nullable().optional(),
});

export async function GET() {
  try {
    const ctx = await requireOrgMember();

    const departments = await prisma.department.findMany({
      where: { orgId: ctx.orgId },
      include: { members: { include: { user: { select: { id: true, name: true } } } } },
      orderBy: { name: "asc" },
    });

    return apiSuccess(departments);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requirePermission("departments:write");
    const body = await req.json();
    const data = createDepartmentSchema.parse(body);

    const department = await prisma.department.create({
      data: {
        orgId: ctx.orgId,
        name: data.name,
        parentId: data.parentId || null,
      },
    });

    return apiSuccess(department, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const ctx = await requirePermission("departments:write");
    const body = await req.json();
    const data = updateDepartmentSchema.parse(body);

    const existing = await prisma.department.findFirst({ where: { id: data.id, orgId: ctx.orgId } });
    if (!existing) return apiError("Department not found", 404);

    const department = await prisma.department.update({
      where: { id: data.id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.parentId !== undefined && { parentId: data.parentId }),
      },
    });

    return apiSuccess(department);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const ctx = await requirePermission("departments:write");
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return apiError("id required", 400);

    const existing = await prisma.department.findFirst({ where: { id, orgId: ctx.orgId } });
    if (!existing) return apiError("Department not found", 404);

    await prisma.department.delete({ where: { id } });
    return apiSuccess({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
