import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// Returns only public page URLs — no tokens
export async function GET() {
  try {
    const log = await prisma.activityLog.findFirst({
      where: { action: "SOCIAL_CONFIG" },
      orderBy: { createdAt: "desc" },
    });

    if (!log?.details) {
      return NextResponse.json({ links: {} });
    }

    const settings = JSON.parse(log.details) as Record<string, { enabled?: boolean; pageUrl?: string }>;

    const links: Record<string, string> = {};
    for (const [platform, cfg] of Object.entries(settings)) {
      if (cfg?.enabled && cfg?.pageUrl) {
        links[platform] = cfg.pageUrl;
      }
    }

    return NextResponse.json({ links }, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
    });
  } catch {
    return NextResponse.json({ links: {} });
  }
}
