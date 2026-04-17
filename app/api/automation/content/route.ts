/**
 * AI Content Generation API
 *
 * POST /api/automation/content
 * Body: { type, topic, tone?, language?, keywords?, wordCount?, context? }
 *
 * GET  /api/automation/content  — history
 */
import { NextRequest, NextResponse } from "next/server";
import { getAutomationCompanyId } from "@/lib/automationHelpers";
import { prisma } from "@/lib/prisma";
import Anthropic from "@anthropic-ai/sdk";



const TYPE_PROMPTS: Record<string, string> = {
  social_post: "Write an engaging social media post (Facebook/Instagram/LinkedIn) for a Pakistani business.",
  email: "Write a professional marketing email for a Pakistani business.",
  ad_copy: "Write compelling advertisement copy (headline + body) for a Pakistani business.",
  product_desc: "Write an attractive product description for a Pakistani business.",
  whatsapp: "Write a short WhatsApp broadcast message. Keep it under 160 characters.",
  blog_intro: "Write an engaging blog post introduction paragraph.",
};

export async function POST(req: NextRequest) {
  try {
    const companyId = await getAutomationCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { type = "social_post", topic, tone = "professional", language = "en", keywords = [], wordCount = 150, context = "" } = body;

    if (!topic) return NextResponse.json({ error: "topic is required" }, { status: 400 });
    if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json({ error: "AI not configured" }, { status: 503 });

    const typePrompt = TYPE_PROMPTS[type] || TYPE_PROMPTS.social_post;
    const langLine = language === "ur" ? "Write in Urdu (Roman Urdu is acceptable)." : "Write in English.";
    const kwLine = keywords.length > 0 ? `Include these keywords: ${keywords.join(", ")}.` : "";
    const ctxLine = context ? `Business context: ${context}.` : "";

    const prompt = `${typePrompt}\n\nTopic: ${topic}\nTone: ${tone}\nTarget ~${wordCount} words.\n${langLine}\n${kwLine}\n${ctxLine}\n\nGenerate the content directly without preamble.`;

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const res = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: Math.min(wordCount * 6, 1500),
      messages: [{ role: "user", content: prompt }],
    });

    const generated = res.content.find(c => c.type === "text")?.text?.trim() || "";

    await prisma.activityLog.create({
      data: { action: "AI_CONTENT_GENERATED", companyId, details: JSON.stringify({ type, topic, words: generated.split(/\s+/).length }) },
    }).catch(() => {});

    return NextResponse.json({ success: true, content: generated, type, wordCount: generated.split(/\s+/).length });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const companyId = await getAutomationCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const logs = await prisma.activityLog.findMany({
      where: { action: "AI_CONTENT_GENERATED", companyId },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { id: true, createdAt: true, details: true },
    });
    return NextResponse.json(logs.map(l => ({ id: l.id, createdAt: l.createdAt, ...JSON.parse(l.details || "{}") })));
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
