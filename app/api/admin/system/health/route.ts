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

    // The Services table used to hard-code "ok" for the database, email and the
    // payment gateway under a heading that reads "Real-time service
    // availability" — including "Stripe operational" on a platform whose live
    // subscriptions run through LemonSqueezy. A status panel that cannot report
    // a problem is worse than no panel, so these three are measured now.

    // Round-trip of a trivial query, which is what "database responding" means
    // here. A thrown error leaves latency null and the row reads as down.
    // Note the figure includes connection setup when the pool is cold
    // (DATABASE_URL runs through pgbouncer with connection_limit=1), so the
    // page's warn threshold is deliberately loose — see app/admin/system/page.tsx.
    let dbLatencyMs: number | null = null;
    try {
      const startedAt = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      dbLatencyMs = Date.now() - startedAt;
    } catch {}

    // Which transport is configured, not whether a send would succeed — probing
    // that would mean sending mail on every page refresh.
    const emailProvider = process.env.RESEND_API_KEY
      ? "Resend"
      : process.env.SMTP_HOST && process.env.SMTP_USER
      ? "SMTP"
      : null;

    const configuredGateways = [
      process.env.LEMONSQUEEZY_API_KEY ? "LemonSqueezy" : null,
      process.env.STRIPE_SECRET_KEY ? "Stripe" : null,
      process.env.SAFEPAY_SECRET_KEY ? "Safepay" : null,
    ].filter((g): g is string => g !== null);

    // The gateway that most recently actually processed a subscription — the
    // honest answer to "which payment provider is this platform on".
    let liveGateway: string | null = null;
    try {
      const latest = await prisma.subscription.findFirst({
        orderBy: { updatedAt: "desc" },
        select: { provider: true },
      });
      liveGateway = latest?.provider || null;
    } catch {}

    const queueFailures24h = 0;

    return NextResponse.json({
      apiErrors24h,
      failedLogins24h,
      backupStatus,
      lastBackupAt,
      queueFailures24h,
      dbLatencyMs,
      emailProvider,
      configuredGateways,
      liveGateway,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
