import { describe, it, expect, vi, beforeEach } from "vitest";
import { rateLimit } from "../rate-limit";

describe("rateLimit", () => {
  beforeEach(() => {
    // Use a unique key prefix per test to avoid cross-test contamination
    vi.restoreAllMocks();
  });

  it("allows requests within the limit", () => {
    const key = `test-allow-${Date.now()}`;
    const maxAttempts = 3;

    const r1 = rateLimit(key, maxAttempts, 60000);
    expect(r1.success).toBe(true);
    expect(r1.remaining).toBe(2);

    const r2 = rateLimit(key, maxAttempts, 60000);
    expect(r2.success).toBe(true);
    expect(r2.remaining).toBe(1);

    const r3 = rateLimit(key, maxAttempts, 60000);
    expect(r3.success).toBe(true);
    expect(r3.remaining).toBe(0);
  });

  it("blocks requests over the limit", () => {
    const key = `test-block-${Date.now()}`;
    const maxAttempts = 2;

    rateLimit(key, maxAttempts, 60000);
    rateLimit(key, maxAttempts, 60000);

    const blocked = rateLimit(key, maxAttempts, 60000);
    expect(blocked.success).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it("resets after the window expires", () => {
    const key = `test-reset-${Date.now()}`;
    const maxAttempts = 1;
    const windowMs = 100; // 100ms window

    // Use up the limit
    rateLimit(key, maxAttempts, windowMs);
    const blocked = rateLimit(key, maxAttempts, windowMs);
    expect(blocked.success).toBe(false);

    // Advance time past the window using fake timers
    vi.useFakeTimers();
    vi.advanceTimersByTime(150);

    const afterReset = rateLimit(key, maxAttempts, windowMs);
    expect(afterReset.success).toBe(true);
    expect(afterReset.remaining).toBe(0);

    vi.useRealTimers();
  });

  it("tracks different keys independently", () => {
    const keyA = `test-a-${Date.now()}`;
    const keyB = `test-b-${Date.now()}`;

    rateLimit(keyA, 1, 60000);
    const blockedA = rateLimit(keyA, 1, 60000);
    expect(blockedA.success).toBe(false);

    // Key B should still work
    const resultB = rateLimit(keyB, 1, 60000);
    expect(resultB.success).toBe(true);
  });

  it("uses default parameters when not specified", () => {
    const key = `test-defaults-${Date.now()}`;
    const result = rateLimit(key);
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(4); // default maxAttempts is 5, so 5-1=4
  });
});
