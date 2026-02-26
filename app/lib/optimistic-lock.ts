import { NextResponse } from "next/server";

/**
 * Checks optimistic locking version from client request body against current DB version.
 * Returns a 409 Conflict response if mismatch, or null if lock check passes.
 *
 * If the client does not send a `version` field, the check is skipped (backwards compatible).
 */
export function checkOptimisticLock(
  body: unknown,
  currentVersion: number,
): NextResponse | null {
  const clientVersion = (body as { version?: number })?.version;

  if (clientVersion !== undefined && clientVersion !== currentVersion) {
    return NextResponse.json(
      {
        error: "Conflict: this record was modified by another user. Please refresh and try again.",
        code: "VERSION_CONFLICT",
        currentVersion,
      },
      { status: 409 },
    );
  }

  return null;
}
