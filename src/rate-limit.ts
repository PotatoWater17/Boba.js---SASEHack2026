type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/** In-memory rate limiter (per server instance). */
export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const entry = buckets.get(key);
  if (!entry || entry.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true as const, retryAfterMs: 0 };
  }
  if (entry.count >= limit) {
    return { ok: false as const, retryAfterMs: Math.max(0, entry.resetAt - now) };
  }
  entry.count += 1;
  return { ok: true as const, retryAfterMs: 0 };
}

export async function clientIp() {
  const { headers } = await import("next/headers");
  const h = await headers();
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip")?.trim() ||
    "local"
  );
}
