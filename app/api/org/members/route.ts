import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import prisma from "@/lib/db";
import { requireOrgMember, requirePermission, apiSuccess, apiError, handleApiError } from "@/lib/api-helpers";
import { canManageRole } from "@/lib/permissions";
import { z } from "zod";
import type { OrgRole } from "@/types/org";

const inviteMemberSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email(),
  password: z.string().min(8).optional(), // Optional — auto-generated if not provided
  role: z.enum(["executive", "finance_manager", "project_manager", "site_supervisor", "field_worker", "viewer"]),
  departmentId: z.string().optional(),
  title: z.string().optional(),
});

function generatePassword(): string {
  // Generate a readable temporary password: 3 words + 2 digits
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz";
  const digits = "23456789";
  let pwd = "";
  for (let i = 0; i < 8; i++) pwd += chars[crypto.randomInt(chars.length)];
  for (let i = 0; i < 3; i++) pwd += digits[crypto.randomInt(digits.length)];
  return pwd;
}

const updateMemberSchema = z.object({
  memberId: z.string().min(1),
  role: z.enum(["executive", "finance_manager", "project_manager", "site_supervisor", "field_worker", "viewer"]).optional(),
  departmentId: z.string().nullable().optional(),
  title: z.string().nullable().optional(),
  moduleOverrides: z.record(z.string(), z.boolean()).nullable().optional(),
  permissionOverrides: z.record(z.string(), z.boolean()).nullable().optional(),
  isActive: z.boolean().optional(),
});

export async function GET() {
  try {
    const ctx = await requireOrgMember();

    const members = await prisma.orgMember.findMany({
      where: { orgId: ctx.orgId },
      include: {
        user: { select: { id: true, name: true, email: true, image: true } },
        department: true,
      },
      orderBy: { joinedAt: "asc" },
    });

    return apiSuccess(members);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requirePermission("team:manage");
    const body = await req.json();
    const data = inviteMemberSchema.parse(body);

    // Check actor can assign this role
    if (!canManageRole(ctx.member.role as OrgRole, data.role)) {
      return apiError("You cannot assign a role equal to or higher than your own", 403);
    }

    // Check if user already exists
    let user = await prisma.user.findUnique({ where: { email: data.email } });
    let createdAccount = false;
    const plainPassword = data.password || generatePassword();

    if (!user) {
      // Create the user account (Shopify-style: owner creates team accounts)
      const passwordHash = await bcrypt.hash(plainPassword, 12);
      user = await prisma.user.create({
        data: {
          name: data.name,
          email: data.email,
          passwordHash,
        },
      });
      createdAccount = true;
    }

    // Check if already a member of this org
    const existing = await prisma.orgMember.findUnique({
      where: { orgId_userId: { orgId: ctx.orgId, userId: user.id } },
    });
    if (existing) {
      if (existing.isActive) return apiError("This user is already a member", 400);
      // Reactivate
      const reactivated = await prisma.orgMember.update({
        where: { id: existing.id },
        data: { isActive: true, role: data.role, departmentId: data.departmentId, title: data.title },
        include: { user: { select: { id: true, name: true, email: true, image: true } } },
      });
      return apiSuccess(reactivated, 201);
    }

    // Update user name if it was different (existing user being added)
    if (!createdAccount && data.name && user.name !== data.name) {
      await prisma.user.update({ where: { id: user.id }, data: { name: data.name } });
    }

    const member = await prisma.orgMember.create({
      data: {
        orgId: ctx.orgId,
        userId: user.id,
        role: data.role,
        departmentId: data.departmentId,
        title: data.title,
        invitedBy: ctx.userId,
      },
      include: { user: { select: { id: true, name: true, email: true, image: true } } },
    });

    // Return credentials if account was just created so the owner can share them
    return apiSuccess({
      ...member,
      ...(createdAccount ? { credentials: { email: data.email, password: plainPassword } } : {}),
    }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const ctx = await requirePermission("team:manage");
    const body = await req.json();
    const data = updateMemberSchema.parse(body);

    const target = await prisma.orgMember.findFirst({
      where: { id: data.memberId, orgId: ctx.orgId },
    });
    if (!target) return apiError("Member not found", 404);

    // Can't manage someone of equal or higher role
    if (!canManageRole(ctx.member.role as OrgRole, target.role as OrgRole)) {
      return apiError("You cannot manage a member with an equal or higher role", 403);
    }

    // If changing role, check new role is manageable
    if (data.role && !canManageRole(ctx.member.role as OrgRole, data.role)) {
      return apiError("You cannot assign a role equal to or higher than your own", 403);
    }

    const updateData: Record<string, unknown> = {};
    if (data.role !== undefined) updateData.role = data.role;
    if (data.departmentId !== undefined) updateData.departmentId = data.departmentId;
    if (data.title !== undefined) updateData.title = data.title;
    if (data.moduleOverrides !== undefined) updateData.moduleOverrides = data.moduleOverrides;
    if (data.permissionOverrides !== undefined) updateData.permissionOverrides = data.permissionOverrides;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const updated = await prisma.orgMember.update({
      where: { id: data.memberId },
      data: updateData,
      include: { user: { select: { id: true, name: true, email: true, image: true } } },
    });

    return apiSuccess(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const ctx = await requirePermission("team:manage");
    const memberId = req.nextUrl.searchParams.get("memberId");
    if (!memberId) return apiError("memberId required", 400);

    const target = await prisma.orgMember.findFirst({
      where: { id: memberId, orgId: ctx.orgId },
    });
    if (!target) return apiError("Member not found", 404);

    // Can't remove yourself
    if (target.userId === ctx.userId) {
      return apiError("You cannot remove yourself from the organisation", 400);
    }

    if (!canManageRole(ctx.member.role as OrgRole, target.role as OrgRole)) {
      return apiError("You cannot remove a member with an equal or higher role", 403);
    }

    // Soft delete — deactivate
    await prisma.orgMember.update({
      where: { id: memberId },
      data: { isActive: false },
    });

    return apiSuccess({ removed: true });
  } catch (error) {
    return handleApiError(error);
  }
}
