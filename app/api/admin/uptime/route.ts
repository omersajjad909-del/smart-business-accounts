/**
 * GET /api/admin/uptime — what the uptime probe has been recording.
 *
 * The cron at /api/cron/uptime-probe has been writing UptimeCheck rows all
 * along, and /status renders them for the public. Nothing showed them to the
 * operator, so an outage was visible to visitors before it was visible to us.
 * This is the admin-side read of the same data.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Same list, same order as the probe and /api/status/health.
const SERVICES = ["web", "api", "db", "reports", "email", "backups", "cdn", "search"] as const;

const WINDOWS: Record<string, number> = { "24h": 24, "7d": 24 * 7, "30d": 24 * 30 };

export async function GET(req: NextRequest) {
  const admin = requireAdmin(req);
  if (admin instanceof NextResponse) return admin;

  const url = new URL(req.url);
  const windowKey = url.searchParams.get("window") || "24h";
  const hours = WINDOWS[windowKey] ?? WINDOWS["24h"];
  const since = new Date(Date.now() - hours * 3600_000);

  const [rows, failures] = await Promise.all([
    prisma.uptimeCheck.findMany({
      where: { checkedAt: { gte: since } },
      orderBy: { checkedAt: "desc" },
      select: { serviceId: true, ok: true, latencyMs: true, error: true, checkedAt: true },
    }),
    // Recent failures across every window, so a quiet service that broke last
    // week is still one click away rather than hidden by the time filter.
    prisma.uptimeCheck.findMany({
      where: { ok: false },
      orderBy: { checkedAt: "desc" },
      take: 50,
      select: { id: true, serviceId: true, error: true, latencyMs: true, checkedAt: true },
    }),
  ]);

  const services = SERVICES.map((serviceId) => {
    const mine = rows.filter((r) => r.serviceId === serviceId);
    const total = mine.length;
    const okCount = mine.filter((r) => r.ok).length;
    const latencies = mine.map((r) => r.latencyMs).filter((n): n is number => typeof n === "number");
    const latest = mine[0] || null;

    return {
      serviceId,
      // No rows means the probe never ran for this service in the window —
      // that is not the same as "healthy", so uptime stays null.
      uptimePct: total > 0 ? Number(((okCount / total) * 100).toFixed(2)) : null,
      checks: total,
      failures: total - okCount,
      avgLatencyMs: latencies.length ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : null,
      maxLatencyMs: latencies.length ? Math.max(...latencies) : null,
      currentlyOk: latest ? latest.ok : null,
      lastCheckedAt: latest ? latest.checkedAt : null,
      lastError: latest && !latest.ok ? latest.error : null,
    };
  });

  const totalChecks = rows.length;
  const totalOk = rows.filter((r) => r.ok).length;

  return NextResponse.json({
    window: windowKey in WINDOWS ? windowKey : "24h",
    since,
    overallUptimePct: totalChecks > 0 ? Number(((totalOk / totalChecks) * 100).toFixed(2)) : null,
    totalChecks,
    totalFailures: totalChecks - totalOk,
    // The probe writes one row per service per run, so this is roughly how many
    // times the cron has fired — a silent cron is itself worth noticing.
    lastRunAt: rows[0]?.checkedAt ?? null,
    services,
    recentFailures: failures,
  });
}
