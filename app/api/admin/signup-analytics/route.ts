import { NextRequest, NextResponse } from "next/server";
import { getTokenFromRequest, verifyJwt } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { countryName, normalizeCountryCode } from "@/lib/countries";
import { requireAdmin } from "@/lib/adminAuth";

function isAdmin(req: NextRequest) {
  const role = String(req.headers.get("x-user-role") || "").toUpperCase();
  if (role === "ADMIN") return true;
  try {
    const p = verifyJwt(getTokenFromRequest(req as any)!);
    return String(p?.role || "").toUpperCase() === "ADMIN";
  } catch { return false; }
}

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin instanceof NextResponse) return admin;
  if (!isAdmin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [logs, companies] = await Promise.all([
    prisma.activityLog.findMany({
      where: { action: "SIGNUP" },
      select: { details: true, createdAt: true, companyId: true },
      orderBy: { createdAt: "desc" },
      take: 2000,
    }),
    // Demo sandboxes and internal test workspaces are not signups. Their flags
    // are selected rather than filtered in the query so a log pointing at one
    // can be skipped outright below — filtering here would instead have made
    // demo signups fall through to the "Not specified"/"Unknown" buckets.
    prisma.company.findMany({
      select: { id: true, businessType: true, plan: true, country: true, isDemo: true, isInternalTest: true },
    }),
  ]);

  const companyMap = new Map(companies.map(c => [c.id, c]));
  const demoCompanyIds = new Set(
    companies.filter(c => c.isDemo || c.isInternalTest).map(c => c.id)
  );

  const referralCounts: Record<string, number> = {};
  const teamSizeCounts: Record<string, number> = {};
  const planCounts: Record<string, number> = {};
  const businessTypeCounts: Record<string, number> = {};
  const countryCounts: Record<string, number> = {};
  const signupsByDay: Record<string, number> = {};

  const realLogs = logs.filter(l => !(l.companyId && demoCompanyIds.has(l.companyId)));

  for (const log of realLogs) {
    try {
      const d = JSON.parse(log.details || "{}");
      const company = log.companyId ? companyMap.get(log.companyId) : null;

      const ref = d.referralSource || "Not specified";
      referralCounts[ref] = (referralCounts[ref] || 0) + 1;

      const ts = d.teamSize || "Not specified";
      teamSizeCounts[ts] = (teamSizeCounts[ts] || 0) + 1;

      const plan = (d.plan || company?.plan || "unknown").toUpperCase();
      planCounts[plan] = (planCounts[plan] || 0) + 1;

      const bt = company?.businessType || "Not specified";
      businessTypeCounts[bt] = (businessTypeCounts[bt] || 0) + 1;

      // Company.country holds "PK" on some rows and "Pakistan" on others, so
      // grouping by the raw value listed one country twice. Normalise to the
      // ISO code first, then label it once.
      const code = normalizeCountryCode(company?.country);
      const country = code ? countryName(code) : "Unknown";
      countryCounts[country] = (countryCounts[country] || 0) + 1;

      const day = log.createdAt.toISOString().slice(0, 10);
      signupsByDay[day] = (signupsByDay[day] || 0) + 1;
    } catch {}
  }

  const toSorted = (obj: Record<string, number>) =>
    Object.entries(obj).sort((a, b) => b[1] - a[1]).map(([label, count]) => ({ label, count }));

  return NextResponse.json({
    total: realLogs.length,
    referralSources: toSorted(referralCounts),
    teamSizes: toSorted(teamSizeCounts),
    plans: toSorted(planCounts),
    businessTypes: toSorted(businessTypeCounts).slice(0, 15),
    countries: toSorted(countryCounts).slice(0, 10),
    signupsByDay: Object.entries(signupsByDay)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-30)
      .map(([date, count]) => ({ date, count })),
  });
}
