import prisma from "./db";
import { logger } from "./logger";

export interface AuditEntry {
  orgId: string;
  userId: string;
  action: "create" | "update" | "delete" | "delete_payment" | "approve" | "reject" | "login" | "logout" | "post" | "reverse" | "reconcile" | "payment";
  entityType: string;
  entityId?: string;
  changes?: Record<string, { old: unknown; new: unknown }>;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export async function writeAuditLog(entry: AuditEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        orgId: entry.orgId,
        userId: entry.userId,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        changes: entry.changes ? (entry.changes as object) : undefined,
        metadata: entry.metadata ? (entry.metadata as object) : undefined,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
      },
    });
  } catch (error) {
    // Never let audit logging failures break the main flow
    logger.error("Failed to write audit log", {
      error: error instanceof Error ? error.message : "Unknown error",
      entry: { action: entry.action, entityType: entry.entityType, entityId: entry.entityId },
    });
  }
}

export function diffChanges(
  original: Record<string, unknown>,
  updated: Record<string, unknown>,
  fields: string[]
): Record<string, { old: unknown; new: unknown }> | undefined {
  const changes: Record<string, { old: unknown; new: unknown }> = {};
  for (const field of fields) {
    const oldVal = original[field];
    const newVal = updated[field];
    if (newVal !== undefined && JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      changes[field] = { old: oldVal, new: newVal };
    }
  }
  return Object.keys(changes).length > 0 ? changes : undefined;
}
