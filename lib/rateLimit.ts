type Bucket = { count: number; windowStart: number };
const store = new Map<string, Bucket>();

export function rateLimit(key: string, max: number, windowMs: number) {
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
