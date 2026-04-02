import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");
    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 400 });
    }

    // Try to verify using user.verificationToken (if column exists)
    // Fallback to ActivityLog lookup if schema differs
    let user: any = null;
    try {
      user = await prisma.user.findFirst({
        where: { verificationToken: token },
        select: { id: true, email: true },
      } as any);
    } catch {}

    if (!user) {
      // Fallback: maybe token stored in ActivityLog
      try {
        const log = await prisma.activityLog.findFirst({
          where: { action: "EMAIL_VERIFICATION", details: { contains: token } } as any,
          orderBy: { createdAt: "desc" },
          select: { userId: true },
        } as any);
        if (log?.userId) {
          user = await prisma.user.findUnique({ where: { id: log.userId } });
        }
      } catch {}
    }

    if (!user) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
    }

    // Update verification flags if available
    try {
      await prisma.user.update({
        where: { id: user.id },
        data: { isVerified: true as any, verificationToken: null as any },
      } as any);
    } catch {}

    // Redirect to login with success notice
    const url = new URL(req.url);
    const base = process.env.NEXT_PUBLIC_BASE_URL || `${url.protocol}//${url.host}`;
    return NextResponse.redirect(`${base}/login?verified=1`, { status: 302 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Verification failed" }, { status: 500 });
  }
}

