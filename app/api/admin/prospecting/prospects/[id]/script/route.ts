import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminAuth";
import { generateOutreachScript, type ScriptChannel, type ScriptLanguage } from "@/lib/prospecting/scripts";

export const runtime = "nodejs";
export const maxDuration = 60;

const db = prisma as any;

/** Drafts a call or WhatsApp script for one prospect. Returns text only; nothing is sent. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(req);
  if (admin instanceof NextResponse) return admin;

  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const channel: ScriptChannel = body.channel === "call" ? "call" : "whatsapp";
    const language: ScriptLanguage = ["en", "ur", "roman_ur"].includes(body.language) ? body.language : "roman_ur";

    const p = await db.prospectCompany.findUnique({
      where: { id },
      select: { name: true, city: true, country: true, industry: true, website: true, enrichment: true },
    });
    if (!p) return NextResponse.json({ error: "Prospect not found" }, { status: 404 });

    const e = (p.enrichment || {}) as Record<string, any>;
    const script = await generateOutreachScript(
      {
        name: p.name,
        city: p.city,
        country: p.country,
        industry: p.industry,
        website: p.website,
        notes: typeof e.notes === "string" ? e.notes : null,
        reviewCount: typeof e.userRatingCount === "number" ? e.userRatingCount : null,
      },
      channel,
      language,
      process.env.OUTREACH_SENDER_NAME || "Umer Sajjad",
    );

    return NextResponse.json({ script, channel, language });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
