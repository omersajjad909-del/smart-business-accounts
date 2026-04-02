// FILE: app/api/public/updates/route.ts
// User dashboard fetches published updates from here — no auth needed
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    let updates: any[] = [];

    try {
      updates = await (prisma as any).productUpdate.findMany({
        where: { published: true },
        orderBy: { createdAt: "desc" },
        take: 100,
        select: { id:true, title:true, body:true, type:true, version:true, createdAt:true },
      });
    } catch {
      // Fallback: ActivityLog
      const logs = await prisma.activityLog.findMany({
        where: { action: "PRODUCT_UPDATE" },
        orderBy: { createdAt: "desc" },
        take: 100,
      });
      updates = logs.map(l => {
        try {
          const d = JSON.parse(l.details||"{}");
          // If published is undefined, assume true for legacy logs
          if (d.published === false) return null;
          return { id:l.id, createdAt:l.createdAt, ...d };
        } catch { return null; }
      }).filter(Boolean);
    }

    return NextResponse.json({ updates }, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
    });
  } catch (e: any) {
    return NextResponse.json({ updates: [] });
  }
}