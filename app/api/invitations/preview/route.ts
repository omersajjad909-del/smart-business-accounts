// FILE: app/api/invitations/preview/route.ts
// Returns invite details (email, role) for a given token — used on accept-invite page
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get("token") || "";
    if (!token) return NextResponse.json({ error: "Token required" }, { status: 400 });

    const log = await prisma.activityLog.findFirst({
      where: { action: "INVITE_SENT", details: { contains: token } } as any,
      orderBy: { createdAt: "desc" },
      select: { details: true },
    } as any);

    if (!log) return NextResponse.json({ error: "Invalid or expired invite" }, { status: 404 });

    const d = JSON.parse((log as any).details || "{}");
    return NextResponse.json({ email: d.email || "", role: d.role || "USER" });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
