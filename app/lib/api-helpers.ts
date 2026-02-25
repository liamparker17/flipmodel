import { NextRequest, NextResponse } from "next/server";
import { auth } from "./auth";
import { type ZodSchema } from "zod";
import { ZodError } from "zod";
import prisma from "./db";
import { hasPermission, canAccessModule } from "./permissions";
import type { Permission, ModuleKey } from "@/types/org";
import { logger } from "./logger";

// ─── Auth Helpers ───

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

// ─── Org Context ───

export interface OrgContext {
  userId: string;
  orgId: string;
  member: {
    id: string;
    role: string;
    departmentId: string | null;
    title: string | null;
    moduleOverrides: Record<string, boolean> | null;
    permissionOverrides: Record<string, boolean> | null;
    isActive: boolean;
  };
}

export async function requireOrgMember(): Promise<OrgContext> {
  const userId = await requireAuth();

  const member = await prisma.orgMember.findFirst({
    where: { userId, isActive: true },
    orderBy: { joinedAt: "asc" },
  });

  if (!member) {
    throw new NoOrgError();
  }

  return {
    userId,
    orgId: member.orgId,
    member: {
      id: member.id,
      role: member.role,
      departmentId: member.departmentId,
      title: member.title,
      moduleOverrides: member.moduleOverrides as Record<string, boolean> | null,
      permissionOverrides: member.permissionOverrides as Record<string, boolean> | null,
      isActive: member.isActive,
    },
  };
}

export async function requirePermission(permission: Permission): Promise<OrgContext> {
  const ctx = await requireOrgMember();
  if (!hasPermission(ctx.member, permission)) {
    throw new ForbiddenError(`Missing permission: ${permission}`);
  }
  return ctx;
}

export async function requireModuleAccess(module: ModuleKey): Promise<OrgContext> {
  const ctx = await requireOrgMember();
  if (!canAccessModule(ctx.member, module)) {
    throw new ForbiddenError(`No access to module: ${module}`);
  }
  return ctx;
}

// ─── Error Classes ───

export class AuthError extends Error {
  constructor() {
    super("Unauthorized");
    this.name = "AuthError";
  }
}

export class NoOrgError extends Error {
  constructor() {
    super("No organisation membership");
    this.name = "NoOrgError";
  }
}

export class ForbiddenError extends Error {
  message: string;
  constructor(message = "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
    this.message = message;
  }
}

// ─── Route Handler Wrappers ───

type ApiHandler = (req: NextRequest, ctx: OrgContext) => Promise<NextResponse>;

/**
 * Wraps an API route handler with permission checking and error handling.
 * Ensures the user is authenticated, is an org member, and has the specified permission.
 */
export function withApi(permission: Permission, handler: ApiHandler) {
  return async (req: NextRequest) => {
    try {
      const ctx = await requirePermission(permission);
      return await handler(req, ctx);
    } catch (error) {
      return handleApiError(error);
    }
  };
}

/**
 * Wraps an API route handler with org membership checking and error handling.
 * Ensures the user is authenticated and is an org member (no specific permission required).
 */
export function withOrgApi(handler: ApiHandler) {
  return async (req: NextRequest) => {
    try {
      const ctx = await requireOrgMember();
      return await handler(req, ctx);
    } catch (error) {
      return handleApiError(error);
    }
  };
}

// ─── Validation & Response Helpers ───

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
  if (error instanceof NoOrgError) {
    return apiError("No organisation membership. Please create or join an organisation.", 403);
  }
  if (error instanceof ForbiddenError) {
    return apiError(error.message, 403);
  }
  if (error instanceof ZodError) {
    return apiError((error as ZodError).issues.map((e) => e.message).join(", "), 400);
  }
  logger.error("Unhandled API error", { error: error instanceof Error ? error.message : "Unknown", stack: error instanceof Error ? error.stack : undefined });
  return apiError("Internal server error", 500);
}
