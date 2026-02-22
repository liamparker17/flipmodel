import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { requireAuth, apiSuccess, handleApiError } from "@/lib/api-helpers";
import { z } from "zod";

const updateProfileSchema = z.object({
  name: z.string().min(1).optional(),
  company: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  preferences: z.any().nullable().optional(),
});

export async function GET() {
  try {
    const userId = await requireAuth();
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        company: true,
        phone: true,
        preferences: true,
        image: true,
        createdAt: true,
      },
    });
    return apiSuccess(user);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const userId = await requireAuth();
    const body = await req.json();
    const data = updateProfileSchema.parse(body);

    const user = await prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        company: true,
        phone: true,
        preferences: true,
        image: true,
      },
    });
    return apiSuccess(user);
  } catch (error) {
    return handleApiError(error);
  }
}
