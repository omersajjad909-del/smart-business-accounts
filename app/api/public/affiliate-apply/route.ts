// FILE: app/api/public/affiliate-apply/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    await prisma.activityLog.create({
      data: { action:"AFFILIATE_APPLICATION", details:JSON.stringify({ ...data, appliedAt:new Date() }) },
    });
    try {
      await (prisma as any).notification.create({
        data: { type:"INFO", title:`Affiliate Application: ${data.name}`, message:`${data.email} — ${data.audience}`, isRead:false },
      });
    } catch {}
    return NextResponse.json({ success:true });
  } catch (e: any) {
    return NextResponse.json({ error:e.message },{ status:500 });
  }
}