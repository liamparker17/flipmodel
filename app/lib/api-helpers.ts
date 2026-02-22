import { NextResponse } from "next/server";
import { auth } from "./auth";
import { type ZodSchema } from "zod";
import { ZodError } from "zod";

export async function getAuthUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

export async function requireAuth(): Promise<string> {
  const userId = await getAuthUserId();
  if (!userId) {
    throw new AuthError();
  }
  return userId;
}

export class AuthError extends Error {
  constructor() {
    super("Unauthorized");
    this.name = "AuthError";
  }
}

export function validateBody<T>(schema: ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}

export function apiSuccess(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function apiError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function handleApiError(error: unknown) {
  if (error instanceof AuthError) {
    return apiError("Unauthorized", 401);
  }
  if (error instanceof ZodError) {
    return apiError((error as ZodError).issues.map((e) => e.message).join(", "), 400);
  }
  console.error("API Error:", error);
  return apiError("Internal server error", 500);
}
