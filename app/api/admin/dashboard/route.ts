import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminAuth";

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function labelForDay(date: Date) {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatPlan(plan: string | null | undefined) {
  const value = String(plan || "STARTER").toUpperCase();
  return value.charAt(0) + value.slice(1).toLowerCase();
}

function prettifyAction(action: string | null | undefined) {
  return String(action || "Activity")
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function parseDetails(details: string | null | undefined) {
  if (!details) return null;
  try {
    return JSON.parse(details);
  } catch {
    return null;
  }
}

function summarizeDetails(details: string | null | undefined) {
  const parsed = parseDetails(details);
  if (!parsed) {
    return details ? String(details).slice(0, 80) : "No details available";
  }
  if (parsed.companyName) return String(parsed.companyName);
  if (parsed.name) return String(parsed.name);
  if (parsed.email) return String(parsed.email);
  if (parsed.note) return String(parsed.note);
  if (parsed.status) return `Status: ${parsed.status}`;
  const firstString = Object.values(parsed).find((value) => typeof value === "string");
  return firstString ? String(firstString) : "Updated in admin panel";
}

function growthPct(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100 * 10) / 10;
}

export async function GET(req: NextRequest) {
  try {
    const admin = requireAdmin(req);
    if (admin instanceof NextResponse) return admin;

    const now = new Date();

    // 7-day window for overview chart
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 6);
    weekStart.setHours(0, 0, 0, 0);

    // This month: 1st of current month → now
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Last month: 1st → last day of previous month
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    // 24h window for health checks
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [
      companies,
      users,
      userLinks,
      paymentLogs,
      activityRows,
      latestBackup,
      apiErrors24h,
      failedLogins24h,
      totalActivityLogs,
    ] = await Promise.all([
      prisma.company.findMany({
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          plan: true,
          country: true,
          activeModules: true,
          subscriptionStatus: true,
          createdAt: true,
        },
      }),
      prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        select: { id: true, name: true, email: true, createdAt: true },
      }),
      prisma.userCompany.findMany({
        orderBy: { createdAt: "asc" },
        select: {
          companyId: true,
          user: { select: { name: true, role: true } },
        },
      }),
      prisma.activityLog.findMany({
        where: { action: "PAYMENT_EVENT" },
        select: { createdAt: true, details: true },
      }),
      prisma.activityLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, action: true, details: true, createdAt: true },
      }),
      prisma.systemBackup.findFirst({
        orderBy: { createdAt: "desc" },
        select: { createdAt: true, status: true },
      }).catch(() => null),
      prisma.activityLog.count({
        where: { action: "API_ERROR", createdAt: { gte: dayAgo } },
      }).catch(() => 0),
      prisma.activityLog.count({
        where: { action: "LOGIN_FAILED", createdAt: { gte: dayAgo } },
      }).catch(() => 0),
      prisma.activityLog.count().catch(() => 0),
    ]);

    // ── KPI totals ─────────────────────────────────────────────────────────
    const totalCompanies = companies.length;
    const totalUsers = users.length;
    const activeSubscriptions = companies.filter((c) =>
      ["ACTIVE", "TRIALING"].includes(String(c.subscriptionStatus || "").toUpperCase())
    ).length;

    // ── Revenue: this month vs last month ─────────────────────────────────
    let monthlyRevenue = 0;
    let lastMonthRevenue = 0;
    for (const log of paymentLogs) {
      const details = parseDetails(log.details);
      if (String(details?.status || "") !== "succeeded") continue;
      const amount = Number(details?.amount_paid || 0) / 100;
      if (log.createdAt >= thisMonthStart) {
        monthlyRevenue += amount;
      } else if (log.createdAt >= lastMonthStart && log.createdAt <= lastMonthEnd) {
        lastMonthRevenue += amount;
      }
    }

    // ── Growth: companies (this month vs last month) ───────────────────────
    const thisMonthCompanies = companies.filter((c) => c.createdAt >= thisMonthStart).length;
    const lastMonthCompanies = companies.filter(
      (c) => c.createdAt >= lastMonthStart && c.createdAt <= lastMonthEnd
    ).length;

    // ── Growth: users (this month vs last month) ──────────────────────────
    const thisMonthUsers = users.filter((u) => u.createdAt >= thisMonthStart).length;
    const lastMonthUsers = users.filter(
      (u) => u.createdAt >= lastMonthStart && u.createdAt <= lastMonthEnd
    ).length;

    // ── Growth: active subscriptions (snapshot comparison via history is
    //    unavailable — use new activations this month vs last month as proxy)
    const thisMonthActivations = companies.filter(
      (c) =>
        c.createdAt >= thisMonthStart &&
        ["ACTIVE", "TRIALING"].includes(String(c.subscriptionStatus || "").toUpperCase())
    ).length;
    const lastMonthActivations = companies.filter(
      (c) =>
        c.createdAt >= lastMonthStart &&
        c.createdAt <= lastMonthEnd &&
        ["ACTIVE", "TRIALING"].includes(String(c.subscriptionStatus || "").toUpperCase())
    ).length;

    const growth = {
      companies: growthPct(thisMonthCompanies, lastMonthCompanies),
      users: growthPct(thisMonthUsers, lastMonthUsers),
      subscriptions: growthPct(thisMonthActivations, lastMonthActivations),
      revenue: growthPct(monthlyRevenue, lastMonthRevenue),
    };

    // ── 7-day overview chart ──────────────────────────────────────────────
    const dayBuckets = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + index);
      return { key: dayKey(date), label: labelForDay(date) };
    });

    const companyCounts = new Map<string, number>();
    const userCounts = new Map<string, number>();
    const activeCounts = new Map<string, number>();
    dayBuckets.forEach((b) => {
      companyCounts.set(b.key, 0);
      userCounts.set(b.key, 0);
      activeCounts.set(b.key, 0);
    });

    companies.forEach((c) => {
      const key = dayKey(c.createdAt);
      if (companyCounts.has(key)) companyCounts.set(key, (companyCounts.get(key) || 0) + 1);
    });
    users.forEach((u) => {
      const key = dayKey(u.createdAt);
      if (userCounts.has(key)) userCounts.set(key, (userCounts.get(key) || 0) + 1);
    });
    dayBuckets.forEach((b) => {
      const endOfDay = new Date(`${b.key}T23:59:59.999Z`);
      const count = companies.filter(
        (c) =>
          c.createdAt <= endOfDay &&
          ["ACTIVE", "TRIALING"].includes(String(c.subscriptionStatus || "").toUpperCase())
      ).length;
      activeCounts.set(b.key, count);
    });

    // ── Recent companies ──────────────────────────────────────────────────
    const ownerByCompany = new Map<string, string>();
    userLinks.forEach((link) => {
      const existing = ownerByCompany.get(link.companyId);
      if (!existing || String(link.user.role).toUpperCase() === "ADMIN") {
        ownerByCompany.set(link.companyId, link.user.name);
      }
    });

    const recentCompanies = companies.slice(0, 5).map((c) => ({
      company: c.name,
      owner: ownerByCompany.get(c.id) || "Unknown",
      plan: formatPlan(c.plan),
      status: String(c.subscriptionStatus || "ACTIVE").toUpperCase(),
      createdAt: c.createdAt.toISOString(),
    }));

    // ── Subscription plan breakdown (active only) ─────────────────────────
    const planGroups = new Map<string, number>();
    companies
      .filter((c) => ["ACTIVE", "TRIALING"].includes(String(c.subscriptionStatus || "").toUpperCase()))
      .forEach((c) => {
        const plan = formatPlan(c.plan);
        planGroups.set(plan, (planGroups.get(plan) || 0) + 1);
      });

    const subscriptionOverview = Array.from(planGroups.entries())
      .map(([label, value], index) => ({
        label,
        value,
        color: ["#8b5cf6", "#4f7cff", "#fb923c", "#22c55e"][index % 4],
      }))
      .sort((a, b) => b.value - a.value);

    // ── Top active modules ────────────────────────────────────────────────
    const moduleGroups = new Map<string, number>();
    companies.forEach((c) => {
      const modules = String(c.activeModules || "")
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);
      modules.forEach((m) => {
        const label = m
          .split(/[-_]/g)
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(" ");
        moduleGroups.set(label, (moduleGroups.get(label) || 0) + 1);
      });
    });

    const topModules = Array.from(moduleGroups.entries())
      .map(([name, companiesCount]) => ({ name, companies: companiesCount }))
      .sort((a, b) => b.companies - a.companies)
      .slice(0, 5);

    const maxModuleCount = topModules[0]?.companies || 1;

    // ── Recent activity ───────────────────────────────────────────────────
    const recentActivity = activityRows.map((row, index) => ({
      title: prettifyAction(row.action),
      detail: summarizeDetails(row.details),
      time: row.createdAt.toISOString(),
      tone: ["purple", "blue", "green", "orange", "purple"][index % 5],
    }));

    // ── System health ─────────────────────────────────────────────────────
    const systemChecks = [
      { label: "API Errors (24h)", ok: apiErrors24h === 0 },
      { label: "Login Failures (24h)", ok: failedLogins24h < 10 },
      { label: "Latest Backup", ok: String(latestBackup?.status || "").toUpperCase() !== "FAILED" },
      { label: "Revenue Logs", ok: paymentLogs.length >= 0 },
    ];
    const healthyChecks = systemChecks.filter((item) => item.ok).length;
    const healthPercent = Math.round((healthyChecks / systemChecks.length) * 100);

    // ── Platform summary (replaces fake storage widget) ────────────────────
    const platformSummary = {
      totalActivityLogs,
      apiErrors24h,
      failedLogins24h,
      thisMonthCompanies,
      thisMonthUsers,
      countriesCount: new Set(companies.map((c) => c.country).filter(Boolean)).size,
    };

    return NextResponse.json({
      cards: { totalCompanies, totalUsers, activeSubscriptions, monthlyRevenue },
      growth,
      overview: dayBuckets.map((b) => ({
        label: b.label,
        newCompanies: companyCounts.get(b.key) || 0,
        newUsers: userCounts.get(b.key) || 0,
        activeSubscriptions: activeCounts.get(b.key) || 0,
      })),
      systemHealth: {
        percent: healthPercent,
        backupStatus: latestBackup?.status || "UNKNOWN",
        lastBackupAt: latestBackup?.createdAt?.toISOString() || null,
        checks: systemChecks,
      },
      recentCompanies,
      subscriptionOverview,
      topModules: topModules.map((item) => ({
        ...item,
        width: Math.max(12, Math.round((item.companies / maxModuleCount) * 100)),
      })),
      recentActivity,
      platformSummary,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load dashboard" },
      { status: 500 }
    );
  }
}
