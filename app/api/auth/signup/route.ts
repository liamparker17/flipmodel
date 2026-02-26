import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/db";
import { apiSuccess, apiError, handleApiError } from "@/lib/api-helpers";
import { signupSchema } from "@/lib/validations/auth";
import { rateLimit } from "@/lib/rate-limit";
import { SIGNUP_RATE_LIMIT_MAX, SIGNUP_RATE_LIMIT_WINDOW_MS } from "@/lib/constants";

export async function POST(req: NextRequest) {
  try {
    // Rate limiting
    const forwarded = req.headers.get("x-forwarded-for");
    const ip = forwarded?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
    const { success } = rateLimit(`signup:${ip}`, SIGNUP_RATE_LIMIT_MAX, SIGNUP_RATE_LIMIT_WINDOW_MS);
    if (!success) {
      return apiError("Too many requests. Please try again later.", 429);
    }

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
