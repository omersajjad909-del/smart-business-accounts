import { NextRequest, NextResponse } from "next/server";
import { generateMarketingText, buildMultilingualPrompt, type AILanguage } from "@/lib/marketingAutopilotAI";

export const runtime = "nodejs";
export const maxDuration = 30;

const CONTENT_TYPES: Record<string, { prompt: (context: string) => string; maxTokens: number }> = {
  invoice_greeting: {
    prompt: (ctx) => `Write a professional, warm greeting for a business invoice email. Business context: ${ctx}. Keep it to 2-3 sentences. Be friendly but professional.`,
    maxTokens: 150,
  },
  payment_reminder: {
    prompt: (ctx) => `Write a polite but firm payment reminder message for an overdue invoice. Business context: ${ctx}. Keep it to 3-4 sentences. Be respectful and professional.`,
    maxTokens: 200,
  },
  marketing_email: {
    prompt: (ctx) => `Write a compelling marketing email body for a business software product. Context: ${ctx}. Keep it to 100-150 words. Focus on value proposition.`,
    maxTokens: 300,
  },
  product_description: {
    prompt: (ctx) => `Write a clear, professional product or service description. Context: ${ctx}. Keep it to 50-80 words. Focus on benefits.`,
    maxTokens: 200,
  },
  customer_welcome: {
    prompt: (ctx) => `Write a warm welcome message for a new business customer. Context: ${ctx}. Keep it to 2-3 sentences. Be warm and encouraging.`,
    maxTokens: 150,
  },
  quotation_note: {
    prompt: (ctx) => `Write a professional note to accompany a business quotation. Context: ${ctx}. Keep it to 2-3 sentences. Be professional and encouraging.`,
    maxTokens: 150,
  },
  sms_reminder: {
    prompt: (ctx) => `Write a short SMS payment reminder. Context: ${ctx}. Maximum 160 characters. Be polite and clear.`,
    maxTokens: 80,
  },
  report_summary: {
    prompt: (ctx) => `Write an executive summary for a financial report. Context: ${ctx}. Keep it to 3-4 sentences. Be concise and data-driven.`,
    maxTokens: 250,
  },
};

const SUPPORTED_LANGUAGES: AILanguage[] = ["en", "es", "de", "fr", "ur", "ar", "zh", "hi", "pt", "it"];

export async function POST(req: NextRequest) {
  try {
    const companyId = req.headers.get("x-company-id");
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }

    const body = await req.json();
    const { contentType, context, language, languages, customPrompt } = body;

    if (!context || typeof context !== "string") {
      return NextResponse.json({ error: "context is required" }, { status: 400 });
    }

    // Validate content type or custom prompt
    if (!customPrompt && !CONTENT_TYPES[contentType]) {
      return NextResponse.json({
        error: `Invalid contentType. Supported: ${Object.keys(CONTENT_TYPES).join(", ")}`,
      }, { status: 400 });
    }

    const basePrompt = customPrompt || CONTENT_TYPES[contentType].prompt(context);
    const maxTokens = CONTENT_TYPES[contentType]?.maxTokens || 300;

    // Single language mode
    if (language && !languages) {
      if (!SUPPORTED_LANGUAGES.includes(language as AILanguage)) {
        return NextResponse.json({
          error: `Unsupported language. Supported: ${SUPPORTED_LANGUAGES.join(", ")}`,
        }, { status: 400 });
      }

      const content = await generateMarketingText(basePrompt, maxTokens, language as AILanguage);
      return NextResponse.json({ content, language, contentType });
    }

    // Multi-language mode — generate for all requested languages in parallel
    const targetLanguages: AILanguage[] = Array.isArray(languages) && languages.length > 0
      ? languages.filter((l: string) => SUPPORTED_LANGUAGES.includes(l as AILanguage)) as AILanguage[]
      : SUPPORTED_LANGUAGES;

    const results = await Promise.allSettled(
      targetLanguages.map(async (lang) => {
        const content = await generateMarketingText(basePrompt, maxTokens, lang);
        return { language: lang, content };
      })
    );

    const translations: Record<string, string> = {};
    const errors: string[] = [];

    for (const result of results) {
      if (result.status === "fulfilled") {
        translations[result.value.language] = result.value.content;
      } else {
        errors.push(String(result.reason));
      }
    }

    return NextResponse.json({
      contentType,
      translations,
      generatedCount: Object.keys(translations).length,
      ...(errors.length > 0 ? { partialErrors: errors } : {}),
    });
  } catch (err: any) {
    console.error("Multilingual AI content error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to generate multilingual content" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    supportedLanguages: SUPPORTED_LANGUAGES,
    contentTypes: Object.keys(CONTENT_TYPES),
    usage: {
      single: "POST with { contentType, context, language }",
      multi: "POST with { contentType, context, languages: ['en','es','de'] }",
      all: "POST with { contentType, context } — generates all 10 languages",
      custom: "POST with { customPrompt, context, language }",
    },
  });
}
