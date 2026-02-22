import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/db";
import { apiSuccess, apiError, handleApiError } from "@/lib/api-helpers";
import { signupSchema } from "@/lib/validations/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = signupSchema.parse(body);

    const existing = await prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existing) {
      return apiError("An account with this email already exists", 409);
    }

    const passwordHash = await bcrypt.hash(data.password, 12);

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash,
        company: data.company || null,
      },
    });

    return apiSuccess(
      { id: user.id, name: user.name, email: user.email },
      201
    );
  } catch (error) {
    return handleApiError(error);
  }
}
