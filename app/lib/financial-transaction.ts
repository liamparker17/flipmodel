import prisma from "./db";
import { logger } from "./logger";
import type { AuditEntry } from "./audit";
import type { PrismaClient, Prisma } from "@prisma/client";

type TxClient = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];

export type { TxClient };

interface FinancialTxOptions<T> {
  /** The transactional business logic. Receives a Prisma transaction client. */
  tx: (prisma: TxClient) => Promise<T>;
  /** Builds the audit entry from the transaction result. */
  audit: (result: T) => AuditEntry;
  /** Isolation level. Defaults to Serializable for financial safety. */
  isolationLevel?: Prisma.TransactionIsolationLevel;
  /**
   * If true (default), an audit log failure will roll back the entire transaction.
   * Set to false for non-critical operations where you prefer the write to succeed
   * even if audit logging fails.
   */
  strictAudit?: boolean;
}

/**
 * Wraps a financial operation and its audit log write in a single Prisma
 * interactive transaction. This guarantees:
 *
 * 1. The business operation and audit log are atomically committed or rolled back.
 * 2. Serializable isolation prevents phantom reads and write skew.
 * 3. Audit gaps from server crashes between commit and audit write are eliminated.
 *
 * Usage:
 * ```ts
 * const payment = await withFinancialTransaction({
 *   tx: async (tx) => {
 *     // ... your financial logic using tx ...
 *     return payment;
 *   },
 *   audit: (payment) => ({
 *     orgId: ctx.orgId,
 *     userId: ctx.userId,
 *     action: "payment",
 *     entityType: "VendorBill",
 *     entityId: billId,
 *     metadata: { paymentId: payment.id },
 *   }),
 * });
 * ```
 */
export async function withFinancialTransaction<T>(
  options: FinancialTxOptions<T>,
): Promise<T> {
  const strict = options.strictAudit ?? true;

  return prisma.$transaction(
    async (tx) => {
      const result = await options.tx(tx);

      const auditEntry = options.audit(result);

      try {
        await tx.auditLog.create({
          data: {
            orgId: auditEntry.orgId,
            userId: auditEntry.userId,
            action: auditEntry.action,
            entityType: auditEntry.entityType,
            entityId: auditEntry.entityId,
            changes: auditEntry.changes
              ? (auditEntry.changes as object)
              : undefined,
            metadata: auditEntry.metadata
              ? (auditEntry.metadata as object)
              : undefined,
            ipAddress: auditEntry.ipAddress,
            userAgent: auditEntry.userAgent,
          },
        });
      } catch (auditError) {
        if (strict) {
          throw auditError;
        }
        logger.error("Non-strict audit log failed inside transaction", {
          error:
            auditError instanceof Error ? auditError.message : "Unknown error",
          entry: {
            action: auditEntry.action,
            entityType: auditEntry.entityType,
            entityId: auditEntry.entityId,
          },
        });
      }

      return result;
    },
    {
      isolationLevel: options.isolationLevel ?? "Serializable",
    },
  );
}
