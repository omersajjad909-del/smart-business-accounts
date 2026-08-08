// FILE: app/api/admin/web/metrics/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromRequest, verifyJwt } from "@/lib/auth";
import { fetchLemonOrders, revenueForMonth, revenueFromPaymentLogs, ym } from "@/lib/lemonRevenue";

async function safeCount(fn: () => Promise<number>): Promise<number> {
  try { return await fn(); } catch { return 0; }
}

export async function GET(req: NextRequest) {
  try {
    let role = String(req.headers.get("x-user-role") || "").toUpperCase();
    if (role !== "ADMIN") {
      const token = getTokenFromRequest(req as any);
      const payload = token ? verifyJwt(token) : null;
      role = String(payload?.role || "").toUpperCase();
      if (role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const now        = new Date();
    const dayAgo     = new Date(now.getTime() - 24 * 3600 * 1000);
    const monthAgo   = new Date(now.getTime() - 30 * 86400 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const totalCompanies = await safeCount(() => prisma.company.count());
    const activeSubs     = await safeCount(() => prisma.company.count({ where: { subscriptionStatus: { in: ["ACTIVE","TRIALING"] } } }));
    const newSignups30d  = await safeCount(() => prisma.company.count({ where: { createdAt: { gte: monthAgo } } }));
    const churnThisMonth = await safeCount(() => prisma.company.count({ where: { subscriptionStatus: { in: ["INACTIVE","CANCELLED"] } } }));

    let logins24h = 0;
    try {
      const sessions = await (prisma as any).session.findMany({ where: { createdAt: { gte: dayAgo } }, select: { userId: true } });
      logins24h = new Set(sessions.map((s: any) => s.userId)).size;
    } catch {}

    // Lemon Squeezy first — it is the system that took the money. The inline
    // parse this replaced looked for the Stripe shape (`status: "succeeded"`,
    // `amount_paid`) that our Lemon Squeezy webhook never writes, so it always
    // reported $0.
    let revenueThisMonth = 0;
    try {
      const orders = await fetchLemonOrders();
      if (orders) {
        revenueThisMonth = revenueForMonth(orders, now);
      } else {
        const logs = await prisma.activityLog.findMany({ where: { action: "PAYMENT_EVENT", createdAt: { gte: monthStart } }, select: { createdAt: true, details: true } });
        revenueThisMonth = revenueFromPaymentLogs(logs)[ym(now)] || 0;
      }
    } catch {}

    const prevTotal  = await safeCount(() => prisma.company.count({ where: { createdAt: { lt: monthAgo } } }));
    const prevActive = await safeCount(() => prisma.company.count({ where: { subscriptionStatus: { in: ["ACTIVE","TRIALING"] }, createdAt: { lt: monthAgo } } }));
    const prevSignup = await safeCount(() => prisma.company.count({ where: { createdAt: { gte: new Date(now.getTime()-60*86400*1000), lt: monthAgo } } }));
    const pct = (c: number, p: number) => p<=0 ? (c>0?100:0) : Math.round(((c-p)/p)*100);

    return NextResponse.json({
      totalCompanies, activeSubs, newSignups30d, churnThisMonth, logins24h, revenueThisMonth,
      trends: { totalCompanies: pct(totalCompanies,prevTotal), activeSubs: pct(activeSubs,prevActive), newSignups30d: pct(newSignups30d,prevSignup), churnThisMonth:0, logins24h:0 },
    });
  } catch (e: any) {
    console.error("[metrics]", e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
