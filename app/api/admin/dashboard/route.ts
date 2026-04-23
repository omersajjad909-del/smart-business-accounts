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

export async function GET(req: NextRequest) {
  try {
    const admin = requireAdmin(req);
    if (admin instanceof NextResponse) return admin;

    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - 6);
    start.setHours(0, 0, 0, 0);

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
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
    ]);

    const totalCompanies = companies.length;
    const totalUsers = users.length;
    const activeSubscriptions = companies.filter((company) =>
      ["ACTIVE", "TRIALING"].includes(String(company.subscriptionStatus || "").toUpperCase())
    ).length;

    let monthlyRevenue = 0;
    for (const log of paymentLogs) {
      if (log.createdAt < monthStart) continue;
      const details = parseDetails(log.details);
      if (String(details?.status || "") !== "succeeded") continue;
      monthlyRevenue += Number(details?.amount_paid || 0) / 100;
    }

    const dayBuckets = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return { key: dayKey(date), label: labelForDay(date) };
    });

    const companyCounts = new Map<string, number>();
    const userCounts = new Map<string, number>();
    const activeCounts = new Map<string, number>();
    dayBuckets.forEach((bucket) => {
      companyCounts.set(bucket.key, 0);
      userCounts.set(bucket.key, 0);
      activeCounts.set(bucket.key, 0);
    });

    companies.forEach((company) => {
      const key = dayKey(company.createdAt);
      if (companyCounts.has(key)) {
        companyCounts.set(key, (companyCounts.get(key) || 0) + 1);
      }
    });

    users.forEach((user) => {
      const key = dayKey(user.createdAt);
      if (userCounts.has(key)) {
        userCounts.set(key, (userCounts.get(key) || 0) + 1);
      }
    });

    dayBuckets.forEach((bucket) => {
      const endOfDay = new Date(`${bucket.key}T23:59:59.999Z`);
      const count = companies.filter(
        (company) =>
          company.createdAt <= endOfDay &&
          ["ACTIVE", "TRIALING"].includes(String(company.subscriptionStatus || "").toUpperCase())
      ).length;
      activeCounts.set(bucket.key, count);
    });

    const ownerByCompany = new Map<string, string>();
    userLinks.forEach((link) => {
      const existing = ownerByCompany.get(link.companyId);
      if (!existing || String(link.user.role).toUpperCase() === "ADMIN") {
        ownerByCompany.set(link.companyId, link.user.name);
      }
    });

    const recentCompanies = companies.slice(0, 5).map((company) => ({
      company: company.name,
      owner: ownerByCompany.get(company.id) || "Unknown",
      plan: formatPlan(company.plan),
      status: String(company.subscriptionStatus || "ACTIVE").toUpperCase(),
      createdAt: company.createdAt.toISOString(),
    }));

    const planGroups = new Map<string, number>();
    companies
      .filter((company) => ["ACTIVE", "TRIALING"].includes(String(company.subscriptionStatus || "").toUpperCase()))
      .forEach((company) => {
        const plan = formatPlan(company.plan);
        planGroups.set(plan, (planGroups.get(plan) || 0) + 1);
      });

    const subscriptionOverview = Array.from(planGroups.entries())
      .map(([label, value], index) => ({
        label,
        value,
        color: ["#8b5cf6", "#4f7cff", "#fb923c", "#22c55e"][index % 4],
      }))
      .sort((a, b) => b.value - a.value);

    const moduleGroups = new Map<string, number>();
    companies.forEach((company) => {
      const modules = String(company.activeModules || "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);
      modules.forEach((moduleName) => {
        const label = moduleName
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
    const recentActivity = activityRows.map((row, index) => ({
      title: prettifyAction(row.action),
      detail: summarizeDetails(row.details),
      time: row.createdAt.toISOString(),
      tone: ["purple", "blue", "green", "orange", "purple"][index % 5],
    }));

    const systemChecks = [
      { label: "API Errors (24h)", ok: apiErrors24h === 0 },
      { label: "Login Failures (24h)", ok: failedLogins24h < 10 },
      { label: "Latest Backup", ok: String(latestBackup?.status || "").toUpperCase() !== "FAILED" },
      { label: "Revenue Logs", ok: paymentLogs.length >= 0 },
    ];
    const healthyChecks = systemChecks.filter((item) => item.ok).length;
    const healthPercent = Math.round((healthyChecks / systemChecks.length) * 100);

    return NextResponse.json({
      cards: {
        totalCompanies,
        totalUsers,
        activeSubscriptions,
        monthlyRevenue,
      },
      overview: dayBuckets.map((bucket) => ({
        label: bucket.label,
        newCompanies: companyCounts.get(bucket.key) || 0,
        newUsers: userCounts.get(bucket.key) || 0,
        activeSubscriptions: activeCounts.get(bucket.key) || 0,
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
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load dashboard" },
      { status: 500 }
    );
  }
}
