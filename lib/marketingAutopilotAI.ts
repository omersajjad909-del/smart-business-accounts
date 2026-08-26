import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

export function hasUsableAIKey(value: string | undefined) {
  const key = (value || "").trim();
  if (!key) return false;

  const lower = key.toLowerCase();
  return !(
    lower.startsWith("your_") ||
    lower.includes("your_") ||
    lower.includes("placeholder") ||
    lower.includes("api_key")
  );
}

type AnthropicResponseLike = {
  content?: Array<{ type?: string; text?: string }>;
};

function extractAnthropicText(response: AnthropicResponseLike) {
  return (response.content || [])
    .map((part) => part?.type === "text" || part?.text ? part.text : "")
    .join("")
    .trim();
}

export function getErrorMessage(error: unknown, fallback = "AI provider request failed") {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error && "message" in error) {
    return String((error as { message?: unknown }).message || fallback);
  }
  return fallback;
}

function providerErrorMessage(error: unknown) {
  const message = getErrorMessage(error);
  if (
    message.toLowerCase().includes("invalid x-api-key") ||
    message.toLowerCase().includes("authentication_error")
  ) {
    return "Configured AI API key was rejected. Update ANTHROPIC_API_KEY or OPENAI_API_KEY in the deployment environment.";
  }
  return message;
}

export type AILanguage = "en" | "es" | "de" | "fr" | "ur" | "ar" | "zh" | "hi" | "pt" | "it";

const LANGUAGE_NAMES: Record<AILanguage, string> = {
  en: "English",
  es: "Spanish",
  de: "German",
  fr: "French",
  ur: "Urdu",
  ar: "Arabic",
  zh: "Chinese (Simplified)",
  hi: "Hindi",
  pt: "Portuguese",
  it: "Italian",
};

export function buildMultilingualPrompt(originalPrompt: string, language: AILanguage = "en"): string {
  if (language === "en") return originalPrompt;
  const langName = LANGUAGE_NAMES[language] || "English";
  return `${originalPrompt}\n\nIMPORTANT: Write your entire response in ${langName}. Do not include any English text unless it is a proper noun, brand name, or technical term that has no ${langName} equivalent.`;
}

/**
 * Azure OpenAI (Microsoft Foundry) client, or null when it is not configured.
 *
 * The Foundry endpoint ends in `/openai/v1`, which is OpenAI-API compatible, so
 * the standard SDK works with a baseURL swap. Azure authenticates with an
 * `api-key` header rather than a bearer token, hence the explicit header.
 *
 * `model` here is the DEPLOYMENT name chosen in Foundry, not the catalogue
 * name — deploying `gpt-5.6-sol` as "finovaos-text" means the call must say
 * "finovaos-text".
 */
export function azureOpenAIClient(): OpenAI | null {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT?.trim();
  const key = process.env.AZURE_OPENAI_API_KEY?.trim();
  if (!endpoint || !hasUsableAIKey(key)) return null;

  return new OpenAI({
    apiKey: key,
    baseURL: endpoint.replace(/\/+$/, ""),
    defaultHeaders: { "api-key": key as string },
  });
}

export async function generateMarketingText(prompt: string, maxTokens: number, language: AILanguage = "en") {
  const localizedPrompt = buildMultilingualPrompt(prompt, language);
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  const errors: string[] = [];

  // Azure first: that is where the credit sits. Falling through to a directly
  // billed provider would quietly spend real money while the credit expires.
  const azure = azureOpenAIClient();
  const azureDeployment = process.env.AZURE_OPENAI_DEPLOYMENT?.trim();
  if (azure && azureDeployment) {
    try {
      const response = await azure.chat.completions.create({
        model: azureDeployment,
        max_tokens: maxTokens,
        messages: [{ role: "user", content: localizedPrompt }],
      });
      const text = response.choices[0]?.message?.content?.trim();
      if (text) return text;
      errors.push("Azure OpenAI returned an empty response.");
    } catch (error: unknown) {
      errors.push(providerErrorMessage(error));
    }
  }

  if (hasUsableAIKey(anthropicKey)) {
    try {
      const anthropic = new Anthropic({ apiKey: anthropicKey });
      const response = await anthropic.messages.create({
        model: process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001",
        max_tokens: maxTokens,
        messages: [{ role: "user", content: localizedPrompt }],
      });

      const text = extractAnthropicText(response);
      if (text) return text;
      errors.push("Anthropic returned an empty response.");
    } catch (error: unknown) {
      errors.push(providerErrorMessage(error));
    }
  }

  if (hasUsableAIKey(openaiKey)) {
    try {
      const openai = new OpenAI({ apiKey: openaiKey });
      const response = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
        max_tokens: maxTokens,
        messages: [{ role: "user", content: localizedPrompt }],
      });

      const text = response.choices[0]?.message?.content?.trim();
      if (text) return text;
      errors.push("OpenAI returned an empty response.");
    } catch (error: unknown) {
      errors.push(providerErrorMessage(error));
    }
  }

  if (!azure && !hasUsableAIKey(anthropicKey) && !hasUsableAIKey(openaiKey)) {
    throw new Error(
      "No usable AI API key configured. Set AZURE_OPENAI_ENDPOINT + AZURE_OPENAI_API_KEY + AZURE_OPENAI_DEPLOYMENT, or ANTHROPIC_API_KEY, or OPENAI_API_KEY.",
    );
  }

  throw new Error(errors.find(Boolean) || "AI generation failed.");
}
