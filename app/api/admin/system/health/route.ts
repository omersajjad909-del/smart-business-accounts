import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromRequest, verifyJwt } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    let role = String(req.headers.get("x-user-role") || "").toUpperCase();
    if (role !== "ADMIN") {
      const token = getTokenFromRequest(req as any);
      const payload = token ? verifyJwt(token) : null;
      role = String(payload?.role || "").toUpperCase();
      if (role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    let apiErrors24h = 0;
    try {
      apiErrors24h = await prisma.activityLog.count({
        where: { action: "API_ERROR", createdAt: { gte: dayAgo } },
      });
    } catch {}

    let failedLogins24h = 0;
    try {
      failedLogins24h = await prisma.activityLog.count({
        where: { action: "LOGIN_FAILED", createdAt: { gte: dayAgo } },
      });
    } catch {}

    let backupStatus: string | null = null;
    let lastBackupAt: Date | null = null;
    try {
      const b = await prisma.systemBackup.findFirst({
        orderBy: { createdAt: "desc" },
      });
      backupStatus = b?.status || null;
      lastBackupAt = b?.createdAt || null;
    } catch {}

    const queueFailures24h = 0;

    return NextResponse.json({
      apiErrors24h,
      failedLogins24h,
      backupStatus,
      lastBackupAt,
      queueFailures24h,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
