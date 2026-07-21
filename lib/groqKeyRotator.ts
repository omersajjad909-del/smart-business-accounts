/**
 * Groq Multi-Account Key Rotator
 *
 * Reads GROQ_API_KEY_1 … GROQ_API_KEY_N from env.
 * Also accepts legacy GROQ_API_KEY as a fallback slot.
 *
 * On each request it iterates keys in order.
 * When a key returns 429 (rate-limited) or 402 (quota) it marks
 * that key as exhausted for this process lifetime and tries the next one.
 * This works on both long-running Node servers and serverless (Vercel).
 *
 * Serverless note: since each invocation may be a fresh process the
 * "exhausted" set is per-process, meaning a cold invocation will always
 * retry from key 1. That is fine — Groq resets quotas daily anyway, and
 * the worst case is one extra 429 round-trip before moving on.
 */

// ─── Collect all keys at startup ─────────────────────────────────────────────

const _keys: string[] = [];

for (let i = 1; i <= 20; i++) {
  const k = process.env[`GROQ_API_KEY_${i}`]?.trim();
  if (k) _keys.push(k);
}

// Legacy single-key fallback (backwards compat)
const _legacy = process.env.GROQ_API_KEY?.trim();
if (_legacy && !_keys.includes(_legacy)) _keys.push(_legacy);

export const HAS_GROQ = _keys.length > 0;
export const GROQ_KEY_COUNT = _keys.length;

// ─── Per-process exhausted set ────────────────────────────────────────────────

const _exhausted = new Set<string>();

// Auto-clear at next UTC midnight so long-running servers get fresh keys daily
function _scheduleMidnightReset() {
  const now = Date.now();
  const midnight = new Date();
  midnight.setUTCHours(24, 1, 0, 0); // 00:01 UTC next day
  const ms = midnight.getTime() - now;
  setTimeout(() => {
    _exhausted.clear();
    console.log("[GroqRotator] Daily reset — all keys restored");
    _scheduleMidnightReset();
  }, ms).unref(); // .unref() so this timer never blocks process exit
}

if (typeof process !== "undefined" && _keys.length > 0) {
  _scheduleMidnightReset();
}

// ─── Main request function ────────────────────────────────────────────────────

type GMessage = { role: string; content: string };

export async function groqRequest(
  messages: GMessage[],
  model: string,
  maxTokens: number,
  temperature: number,
  signal?: AbortSignal,
): Promise<string | null> {
  if (_keys.length === 0) return null;

  for (const key of _keys) {
    if (_exhausted.has(key)) continue; // already burned today

    let res: Response;
    try {
      res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature }),
        signal,
      });
    } catch {
      // Network error — skip to next key
      continue;
    }

    if (res.ok) {
      const json = await res.json().catch(() => null) as {
        choices?: Array<{ message?: { content?: string } }>;
      } | null;
      const text = json?.choices?.[0]?.message?.content?.trim();
      if (text) return text;
      // Empty response — treat as soft failure, try next
      continue;
    }

    if (res.status === 429 || res.status === 402) {
      // Daily quota or rate limit exhausted for this key
      _exhausted.add(key);
      const remaining = _keys.length - _exhausted.size;
      console.warn(
        `[GroqRotator] Key …${key.slice(-6)} quota reached — ${remaining} key(s) remaining today`,
      );
      continue; // Try next key
    }

    if (res.status === 401) {
      // Invalid key — exhaust permanently for this session
      _exhausted.add(key);
      console.warn(`[GroqRotator] Key …${key.slice(-6)} returned 401 (invalid)`);
      continue;
    }

    // Other error (400, 500, etc.) — log but do NOT exhaust key
    console.warn(`[GroqRotator] Key …${key.slice(-6)} returned ${res.status} — skipping request`);
    return null;
  }

  // All keys tried
  const allExhausted = _keys.every((k) => _exhausted.has(k));
  if (allExhausted) {
    console.warn("[GroqRotator] All Groq keys exhausted for today — falling back to OpenAI");
  }
  return null;
}

/** Status snapshot — useful for admin/debug endpoints */
export function groqStatus() {
  return {
    total: _keys.length,
    exhausted: _exhausted.size,
    available: _keys.length - _exhausted.size,
    keys: _keys.map((k, i) => ({
      slot: i + 1,
      suffix: `…${k.slice(-6)}`,
      exhausted: _exhausted.has(k),
    })),
  };
}
