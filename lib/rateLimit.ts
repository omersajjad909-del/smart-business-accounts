import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// ── Upstash-backed limiter (lazy-init, defensive) ─────────────────────────
// We do NOT construct the Redis client at module load. A bad env var (e.g.
// a placeholder like "<from-upstash>") would otherwise throw during build.
// Instead we validate the URL, and lazy-init on first use. Any construction
// or reachability failure falls back to the in-memory bucket.

const rawUrl   = process.env.UPSTASH_REDIS_REST_URL?.trim() || "";
const rawToken = process.env.UPSTASH_REDIS_REST_TOKEN?.trim() || "";

function looksLikeValidUpstash(url: string, token: string): boolean {
  if (!url || !token) return false;
  if (!/^https:\/\//i.test(url)) return false;
  // Reject obvious placeholder values pasted from documentation
  if (/[<>{}]/.test(url) || /[<>{}]/.test(token)) return false;
  if (/^(PASTE|YOUR|CHANGE|FROM|TODO)/i.test(token)) return false;
  return true;
}

const upstashConfigured = looksLikeValidUpstash(rawUrl, rawToken);

let cachedRedis: Redis | null = null;
let redisInitFailed = false;

function getRedis(): Redis | null {
  if (!upstashConfigured || redisInitFailed) return null;
  if (cachedRedis) return cachedRedis;
  try {
    cachedRedis = new Redis({ url: rawUrl, token: rawToken });
    return cachedRedis;
  } catch (err) {
    console.warn("[rateLimit] Upstash Redis init failed, falling back to in-memory:", (err as Error)?.message);
    redisInitFailed = true;
    return null;
  }
}

const limiterCache = new Map<string, Ratelimit>();

function getUpstashLimiter(max: number, windowMs: number): Ratelimit | null {
  const redis = getRedis();
  if (!redis) return null;
  const key = `${max}:${windowMs}`;
  let l = limiterCache.get(key);
  if (l) return l;
  try {
    l = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(max, `${windowMs} ms`),
      analytics: false,
      prefix: "sba:rl",
    });
    limiterCache.set(key, l);
    return l;
  } catch (err) {
    console.warn("[rateLimit] Ratelimit init failed, falling back to in-memory:", (err as Error)?.message);
    return null;
  }
}

// ── In-memory fallback ────────────────────────────────────────────────────
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
export function rateLimit(key: string, max: number, windowMs: number) {
  return memRateLimit(key, max, windowMs);
}

export async function rateLimitAsync(
  key: string,
  max: number,
  windowMs: number
): Promise<{ allowed: boolean; remaining: number }> {
  const limiter = getUpstashLimiter(max, windowMs);
  if (!limiter) return memRateLimit(key, max, windowMs);
  try {
    const { success, remaining } = await limiter.limit(key);
    return { allowed: success, remaining };
  } catch (err) {
    // Reachability / auth failure — degrade to in-memory rather than lock users out
    console.warn("[rateLimit] Upstash limit() failed, using in-memory:", (err as Error)?.message);
    return memRateLimit(key, max, windowMs);
  }
}
