import type { NextRequest } from "next/server";

type Entry = { count: number; resetAt: number };
const buckets = new Map<string, Entry>();

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
  remaining: number;
}

/**
 * Sliding-window rate limiter using an in-memory map.
 *
 * Good enough for local dev and single-instance deployments. On serverless
 * platforms like Vercel where multiple instances are created on demand, each
 * instance keeps its own counter — the effective limit is (max × instances).
 * That still breaks a naive brute-forcer; for strict enforcement move this to
 * a shared store (Supabase row, Upstash Redis, Vercel KV).
 */
export function checkRateLimit(
  key: string,
  opts: { max: number; windowMs: number }
): RateLimitResult {
  const now = Date.now();
  const entry = buckets.get(key);

  if (!entry || entry.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + opts.windowMs });
    return { allowed: true, retryAfterSeconds: 0, remaining: opts.max - 1 };
  }

  if (entry.count >= opts.max) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((entry.resetAt - now) / 1000),
      remaining: 0,
    };
  }

  entry.count += 1;
  return {
    allowed: true,
    retryAfterSeconds: 0,
    remaining: opts.max - entry.count,
  };
}

/** Best-effort client IP extraction from proxy headers. */
export function getClientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}

// Periodic sweep of expired buckets so the map doesn't grow unbounded.
if (typeof globalThis !== "undefined" && !(globalThis as { __vvRateSweep?: boolean }).__vvRateSweep) {
  (globalThis as { __vvRateSweep?: boolean }).__vvRateSweep = true;
  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k);
  }, 60_000).unref?.();
}
