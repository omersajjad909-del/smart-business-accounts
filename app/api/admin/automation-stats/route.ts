import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const role = req.headers.get("x-user-role") || "";
    if (role.toUpperCase() !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const [leads, chatMessages, webhookHits, contentGenerated] = await Promise.all([
      prisma.$queryRaw<{ count: bigint }[]>`SELECT COUNT(*)::int as count FROM "CRMLead"`.then(r => Number(r[0]?.count || 0)).catch(() => 0),
      prisma.activityLog.count({ where: { action: "CHATBOT_MESSAGE" } }).catch(() => 0),
      prisma.$queryRaw<{ count: bigint }[]>`SELECT COALESCE(SUM("hitCount"),0)::int as count FROM "InboundWebhookToken"`.then(r => Number(r[0]?.count || 0)).catch(() => 0),
      prisma.activityLog.count({ where: { action: "AI_CONTENT_GENERATED" } }).catch(() => 0),
    ]);

    return NextResponse.json({ leads, chatMessages, webhookHits, contentGenerated });
  } catch (e: any) {
    return NextResponse.json({ leads: 0, chatMessages: 0, webhookHits: 0, contentGenerated: 0 });
  }
}
