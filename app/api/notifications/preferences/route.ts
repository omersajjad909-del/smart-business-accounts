import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";

export async function GET(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    const latest = await prisma.activityLog.findFirst({
      where: { action: "NOTIFICATION_PREFS", companyId: companyId || null },
      orderBy: { createdAt: "desc" },
    });
    if (latest?.details) return NextResponse.json({ prefs: JSON.parse(latest.details) });
    return NextResponse.json({ prefs: null });
  } catch {
    return NextResponse.json({ prefs: null });
  }
}

export async function POST(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    const { prefs } = await req.json();
    await prisma.activityLog.create({
      data: { action: "NOTIFICATION_PREFS", details: JSON.stringify(prefs), userId: req.headers.get("x-user-id") || null, companyId: companyId || null },
    });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
