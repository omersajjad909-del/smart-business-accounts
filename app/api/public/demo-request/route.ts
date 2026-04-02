// FILE: app/api/public/demo-request/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    await prisma.activityLog.create({
      data: { action:"DEMO_REQUEST", details:JSON.stringify({ ...data, requestedAt:new Date() }) },
    });
    try {
      await (prisma as any).notification.create({
        data: { type:"INFO", title:`Demo Request: ${data.name}`, message:`${data.email} — ${data.date} at ${data.time}`, isRead:false },
      });
    } catch {}
    return NextResponse.json({ success:true });
  } catch (e: any) {
    return NextResponse.json({ error:e.message },{ status:500 });
  }
}