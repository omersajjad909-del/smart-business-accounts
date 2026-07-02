import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// ── Upstash-backed limiter (used when env vars are set) ────────────────────
const url   = process.env.UPSTASH_REDIS_REST_URL?.trim();
const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
const upstashConfigured = Boolean(url && token);

const redis = upstashConfigured
  ? new Redis({ url: url!, token: token! })
  : null;

// Cache limiter instances per (max, windowMs) so we don't recreate them
const limiterCache = new Map<string, Ratelimit>();

function getUpstashLimiter(max: number, windowMs: number): Ratelimit {
  const key = `${max}:${windowMs}`;
  let l = limiterCache.get(key);
  if (l) return l;
  l = new Ratelimit({
    redis: redis!,
    limiter: Ratelimit.slidingWindow(max, `${windowMs} ms`),
    analytics: false,
    prefix: "sba:rl",
  });
  limiterCache.set(key, l);
  return l;
}

// ── In-memory fallback (used when Upstash env vars are not set) ────────────
type Bucket = { count: number; windowStart: number };
const store = new Map<string, Bucket>();

function memRateLimit(key: string, max: number, windowMs: number) {
  const now = Date.now();
  const b = store.get(key);
  if (!b || now - b.windowStart > windowMs) {
    store.set(key, { count: 1, windowStart: now });
    return { allowed: true, remaining: max - 1 };
  }
  if (b.count >= max) return { allowed: false, remaining: 0 };
  b.count += 1;
  return { allowed: true, remaining: max - b.count };
}

// ── Public API ─────────────────────────────────────────────────────────────
// Sync-compatible interface (kept for existing callers). If Upstash is
// configured, this call becomes fire-and-check via a Promise, and callers
// should switch to `rateLimitAsync` for real distributed protection.
export function rateLimit(key: string, max: number, windowMs: number) {
  return memRateLimit(key, max, windowMs);
}

// Preferred async API — uses Upstash sliding window when configured.
// Falls back to the in-memory bucket in dev / when env is missing.
export async function rateLimitAsync(
  key: string,
  max: number,
  windowMs: number
): Promise<{ allowed: boolean; remaining: number }> {
  if (!upstashConfigured) return memRateLimit(key, max, windowMs);
  try {
    const limiter = getUpstashLimiter(max, windowMs);
    const { success, remaining } = await limiter.limit(key);
    return { allowed: success, remaining };
  } catch {
    // Upstash reachability failure — degrade to in-memory rather than lock users out
    return memRateLimit(key, max, windowMs);
  }
}
