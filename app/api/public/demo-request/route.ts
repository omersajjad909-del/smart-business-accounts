// FILE: app/api/public/demo-request/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    let country: string | null = null;

    if (data.sessionId) {
      try {
        const lastVisit = await (prisma as any).siteVisit.findFirst({
          where: { sessionId: String(data.sessionId) },
          orderBy: { visitedAt: "desc" },
          select: { countryName: true, country: true },
        });
        country = lastVisit?.countryName || lastVisit?.country || null;
      } catch {}
    }

    await prisma.activityLog.create({
      data: { action:"DEMO_REQUEST", details:JSON.stringify({ ...data, requestedAt:new Date() }) },
    });
    try {
      await (prisma as any).notification.create({
        data: { type:"INFO", title:`Demo Request: ${data.name}`, message:`${data.email} — ${data.date} at ${data.time}`, isRead:false },
      });
    } catch {}
    // Auto-create lead
    try {
      await (prisma as any).lead.create({
        data: {
          name: data.name || "Unknown",
          email: data.email || "",
          phone: data.phone || null,
          company: data.company || null,
          message: `Demo request for ${data.date} at ${data.time}`,
          source: "demo-request",
          status: "new",
          priority: "high",
          country,
          sessionId: data.sessionId || null,
        },
      });
    } catch {}
    return NextResponse.json({ success:true });
  } catch (e: any) {
    return NextResponse.json({ error:e.message },{ status:500 });
  }
}
