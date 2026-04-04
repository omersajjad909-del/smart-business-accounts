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
    // Auto-create lead
    try {
      await (prisma as any).lead.create({
        data: { name: data.name||"Unknown", email: data.email||"", phone: data.phone||null, company: data.company||null, message: `Demo request for ${data.date} at ${data.time}`, source:"demo-request", status:"new", priority:"high" },
      });
    } catch {}
    return NextResponse.json({ success:true });
  } catch (e: any) {
    return NextResponse.json({ error:e.message },{ status:500 });
  }
}