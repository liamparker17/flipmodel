/**
 * Rate Limiting Module
 *
 * LIMITATION: This implementation uses an in-memory Map, which does NOT persist
 * across Vercel serverless function instances. Each cold-start creates a fresh
 * Map, and concurrent instances maintain separate Maps, so rate limits are only
 * enforced within a single instance's lifetime. This means actual request
 * throughput can exceed the configured limits under real-world serverless
 * conditions.
 *
 * TODO: Migrate to Redis or Vercel KV for distributed rate limiting that works
 * correctly across all serverless instances. Set the RATE_LIMIT_KV_URL env var
 * to enable a persistent backing store once implemented.
 */

import { logger } from "./logger";

// ─── Startup warning ───

let _startupWarningEmitted = false;

function emitStartupWarning() {
  if (_startupWarningEmitted) return;
  _startupWarningEmitted = true;

  if (!process.env.RATE_LIMIT_KV_URL) {
    logger.warn(
      "RATE_LIMIT_KV_URL is not set. Rate limiting is using in-memory storage, " +
        "which is unreliable in serverless environments. Set RATE_LIMIT_KV_URL " +
        "to a Redis/Vercel KV connection string for production use."
    );
  }
}

// ─── In-memory store (fallback) ───

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function rateLimit(
  key: string,
  maxAttempts: number = 5,
  windowMs: number = 15 * 60 * 1000
): { success: boolean; remaining: number } {
  emitStartupWarning();

  const now = Date.now();
  const record = rateLimitMap.get(key);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return { success: true, remaining: maxAttempts - 1 };
  }

  if (record.count >= maxAttempts) {
    return { success: false, remaining: 0 };
  }

  record.count++;
  return { success: true, remaining: maxAttempts - record.count };
}

export function rateLimitApi(
  key: string,
  maxRequests: number = 100,
  windowMs: number = 60 * 1000
): { success: boolean; remaining: number } {
  return rateLimit(`api:${key}`, maxRequests, windowMs);
}

// Cleanup stale entries every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, val] of rateLimitMap.entries()) {
      if (now > val.resetTime) rateLimitMap.delete(key);
    }
  }, 5 * 60 * 1000).unref?.();
}
