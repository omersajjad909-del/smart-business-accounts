import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromRequest, verifyJwt } from "@/lib/auth";

function isAdmin(req: NextRequest) {
  const role = String(req.headers.get("x-user-role") || "").toUpperCase();
  if (role === "ADMIN") return true;
  try {
    const p = verifyJwt(getTokenFromRequest(req as any)!);
    return String(p?.role || "").toUpperCase() === "ADMIN";
  } catch { return false; }
}

function ym(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = req.nextUrl;
  const days = Math.min(90, Math.max(7, parseInt(searchParams.get("days") || "30")));
  const since = new Date(Date.now() - days * 86400 * 1000);

  const [
    totalVisitors,
    recentVisitors,
    signupLogs,
    companies,
    paymentLogs,
  ] = await Promise.all([
    // All unique site visitors (all time)
    (prisma as any).siteVisit.groupBy({
      by: ["sessionId"],
      _count: { sessionId: true },
    }).then((r: any[]) => r.length).catch(() => 0),

    // Recent unique visitors
    (prisma as any).siteVisit.groupBy({
      by: ["sessionId"],
      where: { visitedAt: { gte: since } },
      _count: { sessionId: true },
    }).then((r: any[]) => r.length).catch(() => 0),

    // Signups with details
    prisma.activityLog.findMany({
      where: { action: "SIGNUP" },
      select: { details: true, createdAt: true, companyId: true },
      orderBy: { createdAt: "desc" },
    }),

    // All companies with subscription info
    prisma.company.findMany({
      select: {
        id: true,
        plan: true,
        subscriptionStatus: true,
        createdAt: true,
        cancelledAt: true,
        country: true,
      },
    }),

    // Payment events
    prisma.activityLog.findMany({
      where: { action: "PAYMENT_EVENT" },
      select: { details: true, createdAt: true, companyId: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  // --- Funnel counts ---
  const totalSignups     = signupLogs.length;
  const recentSignups    = signupLogs.filter(l => l.createdAt >= since).length;

  const activeCompanies  = companies.filter(c => String(c.subscriptionStatus || "").toUpperCase() === "ACTIVE");
  const cancelledCompanies = companies.filter(c => String(c.subscriptionStatus || "").toUpperCase() === "CANCELLED");

  // Paid = companies that have had a succeeded payment event
  const paidCompanyIds = new Set<string>();
  let totalRevenue = 0;
  for (const log of paymentLogs) {
    try {
      const d = log.details ? JSON.parse(log.details) : null;
      if (!d || d.status !== "succeeded") continue;
      if (log.companyId) paidCompanyIds.add(log.companyId);
      totalRevenue += Number(d.amount_paid || 0) / 100;
    } catch {}
  }

  // Recent paid (in time window)
  const recentPaidIds = new Set<string>();
  for (const log of paymentLogs.filter(l => l.createdAt >= since)) {
    try {
      const d = log.details ? JSON.parse(log.details) : null;
      if (!d || d.status !== "succeeded") continue;
      if (log.companyId) recentPaidIds.add(log.companyId);
    } catch {}
  }

  // --- Plan breakdown of active companies ---
  const planCounts: Record<string, number> = {};
  for (const c of activeCompanies) {
    const p = String(c.plan || "STARTER").toUpperCase();
    planCounts[p] = (planCounts[p] || 0) + 1;
  }

  // --- Referral sources from signups ---
  const refCounts: Record<string, number> = {};
  const refPaid: Record<string, number> = {};
  const companySignupMap = new Map<string, { referralSource: string }>();

  for (const log of signupLogs) {
    try {
      const d = log.details ? JSON.parse(log.details) : {};
      const ref = d.referralSource || "Direct / Unknown";
      refCounts[ref] = (refCounts[ref] || 0) + 1;
      if (log.companyId) companySignupMap.set(log.companyId, { referralSource: ref });
    } catch {}
  }
  for (const [cid, info] of companySignupMap) {
    if (paidCompanyIds.has(cid)) {
      refPaid[info.referralSource] = (refPaid[info.referralSource] || 0) + 1;
    }
  }

  // --- Monthly trend (last 6 months) ---
  const now = new Date();
  const months: string[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(ym(d));
  }

  const monthlySignups: Record<string, number> = {};
  const monthlyActive: Record<string, number> = {};
  const monthlyPaid: Record<string, number> = {};

  for (const log of signupLogs) {
    const k = ym(log.createdAt);
    if (months.includes(k)) monthlySignups[k] = (monthlySignups[k] || 0) + 1;
  }
  for (const c of companies) {
    const k = ym(c.createdAt);
    if (months.includes(k) && String(c.subscriptionStatus || "").toUpperCase() === "ACTIVE") {
      monthlyActive[k] = (monthlyActive[k] || 0) + 1;
    }
  }
  for (const log of paymentLogs) {
    try {
      const d = log.details ? JSON.parse(log.details) : null;
      if (!d || d.status !== "succeeded") continue;
      const k = ym(log.createdAt);
      if (months.includes(k)) monthlyPaid[k] = (monthlyPaid[k] || 0) + 1;
    } catch {}
  }

  const trend = months.map(m => ({
    month: m,
    signups: monthlySignups[m] || 0,
    active:  monthlyActive[m]  || 0,
    paid:    monthlyPaid[m]    || 0,
  }));

  // --- Conversion rates ---
  const visitorToSignup  = totalVisitors  > 0 ? (totalSignups / totalVisitors)  * 100 : 0;
  const signupToActive   = totalSignups   > 0 ? (activeCompanies.length / totalSignups) * 100 : 0;
  const activeToPaid     = activeCompanies.length > 0 ? (paidCompanyIds.size / activeCompanies.length) * 100 : 0;
  const overallConversion = totalVisitors > 0 ? (paidCompanyIds.size / totalVisitors) * 100 : 0;

  return NextResponse.json({
    period: { days, since: since.toISOString() },
    funnel: [
      { step: "Site Visitors",       count: totalVisitors,          recent: recentVisitors,            color: "#818cf8", icon: "👥" },
      { step: "Signups",             count: totalSignups,           recent: recentSignups,             color: "#34d399", icon: "✍️" },
      { step: "Active Subscriptions",count: activeCompanies.length, recent: activeCompanies.length,    color: "#38bdf8", icon: "✅" },
      { step: "Paid (Revenue)",      count: paidCompanyIds.size,    recent: recentPaidIds.size,        color: "#fbbf24", icon: "💰" },
    ],
    conversions: {
      visitorToSignup:   Math.round(visitorToSignup   * 100) / 100,
      signupToActive:    Math.round(signupToActive    * 100) / 100,
      activeToPaid:      Math.round(activeToPaid      * 100) / 100,
      overallConversion: Math.round(overallConversion * 100) / 100,
    },
    planDistribution: Object.entries(planCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([plan, count]) => ({ plan, count })),
    referralSources: Object.entries(refCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([source, signups]) => ({ source, signups, paid: refPaid[source] || 0 })),
    trend,
    summary: {
      totalRevenue:   Math.round(totalRevenue),
      cancelled:      cancelledCompanies.length,
      churnRate:      companies.length > 0 ? Math.round((cancelledCompanies.length / companies.length) * 10000) / 100 : 0,
    },
  });
}
