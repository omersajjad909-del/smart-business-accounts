/**
 * The model calls prospecting makes — routed to Gemini's free tier first.
 *
 * `generateMarketingText` (lib/marketingAutopilotAI.ts) is shared with the rest
 * of the marketing autopilot and deliberately prefers Azure, then Anthropic,
 * then OpenAI — none of which are free once a key is set. Prospecting is being
 * validated on $0 spend right now, so it gets its own entry point: Gemini's
 * free tier first, falling back to the shared chain only if Gemini is not
 * configured or fails. Changing the shared function's own priority would have
 * also changed cost behaviour for ads/content/outreach generation, which is
 * out of scope here.
 */

import { aiUrl } from "@/lib/aiGateway";
import { generateMarketingText } from "@/lib/marketingAutopilotAI";

async function generateViaGrok(prompt: string, maxTokens: number): Promise<string> {
  const key = process.env.XAI_API_KEY || process.env.GROK_API_KEY;
  if (!key) throw new Error("XAI_API_KEY / GROK_API_KEY not set.");

  // xAI is not one of the gateway's known providers (lib/aiGateway.ts), so this
  // always goes direct rather than through CF_AI_GATEWAY_*.
  const res = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: process.env.GROK_MODEL || "grok-4-fast",
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    throw new Error(`Grok error ${res.status}: ${(await res.text().catch(() => "")).slice(0, 300)}`);
  }

  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const text = json.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("Grok returned an empty response.");
  return text;
}

async function generateViaGemini(prompt: string, maxTokens: number): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY not set.");

  const res = await fetch(
    aiUrl(
      "google-ai-studio",
      `v1beta/models/gemini-flash-latest:generateContent?key=${key}`,
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${key}`,
    ),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: maxTokens },
      }),
    },
  );

  if (!res.ok) {
    throw new Error(`Gemini error ${res.status}: ${(await res.text().catch(() => "")).slice(0, 300)}`);
  }

  const json = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> }; finishReason?: string }>;
  };
  const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("").trim();
  if (!text) throw new Error("Gemini returned an empty response.");
  return text;
}

/**
 * Same contract as `generateMarketingText`: a prompt in, raw model text out.
 * Tries Gemini's free tier, then Grok/xAI, before falling back to the shared
 * paid chain — so a quota blip on either free provider does not stall a real
 * run, but normal testing never touches a metered key.
 */
export async function generateProspectingText(prompt: string, maxTokens: number): Promise<string> {
  if (process.env.GEMINI_API_KEY) {
    try {
      return await generateViaGemini(prompt, maxTokens);
    } catch (error) {
      console.warn("[prospecting/ai] Gemini failed, trying next provider:", error instanceof Error ? error.message : error);
    }
  }

  if (process.env.XAI_API_KEY || process.env.GROK_API_KEY) {
    try {
      return await generateViaGrok(prompt, maxTokens);
    } catch (error) {
      console.warn("[prospecting/ai] Grok failed, falling back:", error instanceof Error ? error.message : error);
    }
  }

  return generateMarketingText(prompt, maxTokens);
}
