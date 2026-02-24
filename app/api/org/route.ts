import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { requireAuth, requireOrgMember, requirePermission, apiSuccess, apiError, handleApiError } from "@/lib/api-helpers";
import { z } from "zod";
import { DEFAULT_ORG_SETTINGS } from "@/types/org";

const createOrgSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
  currency: z.string().optional(),
  timezone: z.string().optional(),
});

const updateOrgSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/).optional(),
  logo: z.string().nullable().optional(),
  currency: z.string().optional(),
  timezone: z.string().optional(),
  settings: z.any().optional(),
});

export async function GET() {
  try {
    const ctx = await requireOrgMember();

    const org = await prisma.organisation.findUnique({
      where: { id: ctx.orgId },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, email: true, image: true } } },
          where: { isActive: true },
        },
        departments: true,
      },
    });

    if (!org) return apiError("Organisation not found", 404);
    // Include the current user's member ID so the client can identify themselves
    return apiSuccess({ ...org, currentMemberId: ctx.member.id, currentUserId: ctx.userId });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await requireAuth();
    const body = await req.json();
    const data = createOrgSchema.parse(body);

    // Check if user already has an org
    const existingMember = await prisma.orgMember.findFirst({
      where: { userId, isActive: true },
    });
    if (existingMember) {
      return apiError("You already belong to an organisation", 400);
    }

    // Check slug uniqueness
    const existingOrg = await prisma.organisation.findUnique({ where: { slug: data.slug } });
    if (existingOrg) {
      return apiError("This slug is already taken", 400);
    }

    const org = await prisma.organisation.create({
      data: {
        name: data.name,
        slug: data.slug,
        currency: data.currency || "ZAR",
        timezone: data.timezone || "Africa/Johannesburg",
        settings: JSON.parse(JSON.stringify(DEFAULT_ORG_SETTINGS)),
        members: {
          create: {
            userId,
            role: "executive",
            title: "Owner",
          },
        },
      },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, email: true, image: true } } },
        },
      },
    });

    return apiSuccess(org, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const ctx = await requirePermission("org:write");
    const body = await req.json();
    const data = updateOrgSchema.parse(body);

    if (data.slug) {
      const existingOrg = await prisma.organisation.findFirst({
        where: { slug: data.slug, id: { not: ctx.orgId } },
      });
      if (existingOrg) return apiError("This slug is already taken", 400);
    }

    const org = await prisma.organisation.update({
      where: { id: ctx.orgId },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.slug && { slug: data.slug }),
        ...(data.logo !== undefined && { logo: data.logo }),
        ...(data.currency && { currency: data.currency }),
        ...(data.timezone && { timezone: data.timezone }),
        ...(data.settings && { settings: data.settings }),
      },
    });

    return apiSuccess(org);
  } catch (error) {
    return handleApiError(error);
  }
}
