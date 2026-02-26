import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
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

export class NotFoundError extends Error {
  constructor(message = "Resource not found") {
    super(message);
    this.name = "NotFoundError";
  }
}

export class ValidationError extends Error {
  public code: string;
  constructor(code: string, message?: string) {
    super(message || code);
    this.name = "ValidationError";
    this.code = code;
  }
}

export class BudgetExceededError extends Error {
  public totalExpenses: number;
  public budget: number;
  constructor(totalExpenses: number, budget: number) {
    const pct = (((totalExpenses / budget) - 1) * 100).toFixed(1);
    super(`Budget exceeded by ${pct}%. Total: ${totalExpenses.toFixed(2)}, Budget: ${budget.toFixed(2)}`);
    this.name = "BudgetExceededError";
    this.totalExpenses = totalExpenses;
    this.budget = budget;
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
    logger.warn("Forbidden access attempt", { detail: error.message });
    return apiError("Forbidden", 403);
  }
  if (error instanceof NotFoundError) {
    return apiError(error.message, 404);
  }
  if (error instanceof BudgetExceededError) {
    return NextResponse.json(
      {
        error: error.message,
        code: "BUDGET_LIMIT_EXCEEDED",
        canOverride: true,
        totalExpenses: error.totalExpenses,
        budget: error.budget,
      },
      { status: 400 },
    );
  }
  if (error instanceof ValidationError) {
    return apiError(error.message, 400);
  }
  if (error instanceof ZodError) {
    return apiError((error as ZodError).issues.map((e) => e.message).join(", "), 400);
  }
  // Prisma unique constraint violation → 409 Conflict
  if (
    error instanceof Error &&
    "code" in error &&
    (error as { code: string }).code === "P2002"
  ) {
    const meta = (error as { meta?: { target?: string[] } }).meta;
    const fields = meta?.target?.join(", ") || "unknown field";
    logger.warn("Unique constraint violation", { error: error.message, fields });
    return NextResponse.json(
      { error: `Duplicate record — a conflicting entry already exists on: ${fields}`, code: "DUPLICATE_RECORD" },
      { status: 409 },
    );
  }
  // Prisma record not found (e.g. concurrent delete or stale ID)
  if (
    error instanceof Error &&
    "code" in error &&
    (error as { code: string }).code === "P2025"
  ) {
    logger.warn("Record not found during update", { error: error.message });
    return apiError("Record not found or was deleted by another user", 404);
  }
  Sentry.captureException(error);
  logger.error("Unhandled API error", { error: error instanceof Error ? error.message : "Unknown", stack: error instanceof Error ? error.stack : undefined });
  return apiError("Internal server error", 500);
}
