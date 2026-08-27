/**
 * lib/ai/adminAI.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * The one entry point every AI page in the admin console calls.
 *
 * There is no new provider here. `openAITextResponse` in lib/finovaAI.ts already
 * owns the Groq-key rotation, the OpenAI fallback and the Cloudflare gateway
 * routing, and duplicating that in fifteen route handlers is how three of them
 * end up on a different model with a different timeout. This module adds the two
 * things the console needs on top of it:
 *
 *   1. A JSON mode. Every one of these pages wants a ranked list or a scored
 *      record back, not prose, and a model asked for JSON will still wrap it in
 *      a ``` fence roughly one time in five. `askJson` strips the fence, finds
 *      the outermost bracket pair and fails soft rather than throwing a parse
 *      error into a route handler.
 *   2. A house system prompt. These pages advise the operator of FinovaOS, not
 *      its customers — so the model is told, once and in one place, that it is
 *      allowed to say "the data does not support a conclusion", and that it must
 *      never invent a customer name, a number, or a quote. On a four-customer
 *      SaaS an invented figure is not a rounding error; it is the whole report.
 */

import { openAITextResponse } from "@/lib/finovaAI";
import { HAS_GROQ } from "@/lib/groqKeyRotator";

/** Whether any provider is reachable. Pages render a setup notice when false. */
export function aiConfigured(): boolean {
  return HAS_GROQ || Boolean(process.env.OPENAI_API_KEY);
}

/**
 * Prepended to every admin AI prompt.
 *
 * The "do not invent" clause is not boilerplate. These pages read a live
 * database and hand the result to someone who will act on it — email a
 * customer, change a price, rewrite a landing page. A hallucinated company name
 * in a churn list costs an apology; a hallucinated revenue figure in a case
 * study is a public claim that cannot be defended.
 */
const HOUSE_RULES = `
You are the analyst inside the FinovaOS admin console. FinovaOS is a cloud
accounting and ERP platform for small and medium businesses, sold mainly in
Pakistan and the Gulf. You are speaking to the founder who runs it, not to a
customer.

Rules you never break:
- Use only the data given to you in the prompt. Never invent a company name, a
  person, a number, a date, or a quotation. If a field is missing, say it is
  missing.
- Small numbers are real numbers. If the data covers four customers, say what
  four customers show; do not extrapolate to a percentage or a trend.
- When the evidence does not support a conclusion, say so plainly and stop.
  "Not enough data yet" is a correct and useful answer here.
- Be direct and short. No preamble, no flattery, no restating the question.
- Currency is whatever the data says it is. Never convert between currencies.
`.trim();

/** A free-text answer. `system` is appended to the house rules, not replacing them. */
export async function askAI(system: string, user: string, maxTokens = 1200): Promise<string> {
  return openAITextResponse(`${HOUSE_RULES}\n\n${system.trim()}`, [{ role: "user", content: user }], maxTokens);
}

/**
 * Pull the first balanced JSON object or array out of a model response.
 *
 * Handles the three shapes that actually come back: bare JSON, JSON inside a
 * ```json fence, and JSON with a sentence of commentary in front of it.
 */
function extractJson(raw: string): string | null {
  let text = raw.trim();

  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) text = fence[1].trim();

  const start = text.search(/[[{]/);
  if (start === -1) return null;

  const open = text[start];
  const close = open === "{" ? "}" : "]";
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (escaped) { escaped = false; continue; }
    if (ch === "\\") { escaped = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === open) depth++;
    else if (ch === close) {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

/**
 * A structured answer.
 *
 * Returns null rather than throwing when the model returns something
 * unparseable — every caller has a "could not analyse" state to fall back to,
 * and a 500 on a dashboard tile is worse than an empty tile.
 */
export async function askJson<T>(system: string, user: string, maxTokens = 1600): Promise<T | null> {
  const instruction = `${system.trim()}

Reply with JSON only. No prose before or after it, no code fence, no markdown.`;

  let raw: string;
  try {
    raw = await askAI(instruction, user, maxTokens);
  } catch (err) {
    console.error("[adminAI] provider call failed:", err);
    return null;
  }

  const json = extractJson(raw);
  if (!json) {
    console.warn("[adminAI] no JSON found in response:", raw.slice(0, 300));
    return null;
  }
  try {
    return JSON.parse(json) as T;
  } catch (err) {
    console.warn("[adminAI] JSON parse failed:", err, json.slice(0, 300));
    return null;
  }
}

/**
 * Cap a block of context before it goes into a prompt.
 *
 * These pages assemble their context from live tables, and a company with three
 * years of invoices would otherwise push a single request past the model's
 * window and fail the whole page.
 */
export function clip(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars)}\n…[${text.length - maxChars} more characters omitted]`;
}
