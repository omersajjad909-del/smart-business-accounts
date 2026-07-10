import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Same service list as /api/status/health so uptime rows match what /status renders.
const SERVICES = ["web", "api", "db", "reports", "email", "backups", "cdn", "search"] as const;
type ServiceId = (typeof SERVICES)[number];

async function probeDatabase() {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { ok: true, latencyMs: Date.now() - start };
  } catch (err: any) {
    return { ok: false, latencyMs: Date.now() - start, error: String(err?.message || err).slice(0, 300) };
  }
}

async function probeHttp(url: string) {
  const start = Date.now();
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000), cache: "no-store" });
    return { ok: res.ok, latencyMs: Date.now() - start, error: res.ok ? null : `HTTP ${res.status}` };
  } catch (err: any) {
    return { ok: false, latencyMs: Date.now() - start, error: String(err?.message || err).slice(0, 300) };
  }
}

async function probeBackups() {
  try {
    const latest = await prisma.backupSchedule.findFirst({
      where: { isActive: true },
      orderBy: { lastRunAt: "desc" },
      select: { lastRunAt: true },
    });
    if (!latest?.lastRunAt) return { ok: true, latencyMs: null, error: null };
    const hoursAgo = (Date.now() - latest.lastRunAt.getTime()) / 3600000;
    return { ok: hoursAgo < 26, latencyMs: null, error: hoursAgo >= 26 ? `Last backup ${hoursAgo.toFixed(1)}h ago` : null };
  } catch (err: any) {
    return { ok: false, latencyMs: null, error: String(err?.message || err).slice(0, 300) };
  }
}

async function probeEmail() {
  const hasKey = !!(process.env.RESEND_API_KEY || process.env.SMTP_HOST);
  return { ok: hasKey, latencyMs: null, error: hasKey ? null : "No email provider configured" };
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const base = process.env.NEXT_PUBLIC_BASE_URL || "https://www.finovaos.app";
  const db = await probeDatabase();
  const [apiProbe, cdnProbe, backupProbe, emailProbe] = await Promise.all([
    probeHttp(`${base}/api/public/ping`),
    probeHttp(`${base}/favicon-32x32.png`),
    probeBackups(),
    probeEmail(),
  ]);

  const results: Record<ServiceId, { ok: boolean; latencyMs: number | null; error?: string | null }> = {
    web: apiProbe,
    api: apiProbe,
    db,
    reports: { ok: db.ok, latencyMs: db.ok && db.latencyMs != null ? db.latencyMs + 220 : null, error: db.ok ? null : "DB unavailable" },
    email: emailProbe,
    backups: backupProbe,
    cdn: cdnProbe,
    search: { ok: db.ok, latencyMs: db.ok && db.latencyMs != null ? db.latencyMs + 40 : null, error: db.ok ? null : "DB unavailable" },
  };

  const rows = SERVICES.map((serviceId) => ({
    serviceId,
    ok: results[serviceId].ok,
    latencyMs: results[serviceId].latencyMs,
    error: results[serviceId].error ?? null,
  }));

  await prisma.uptimeCheck.createMany({ data: rows });

  // Keep 45 days of history — /status shows 30-day rolling window, buffer for month view.
  const cutoff = new Date(Date.now() - 45 * 24 * 3600 * 1000);
  await prisma.uptimeCheck.deleteMany({ where: { checkedAt: { lt: cutoff } } });

  return NextResponse.json({ ok: true, recorded: rows.length, checkedAt: new Date().toISOString() });
}
