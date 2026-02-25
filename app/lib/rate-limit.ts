const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function rateLimit(
  key: string,
  maxAttempts: number = 5,
  windowMs: number = 15 * 60 * 1000
): { success: boolean; remaining: number } {
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
