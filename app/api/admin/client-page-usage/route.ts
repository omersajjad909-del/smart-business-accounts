import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminAuth";

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    if (admin instanceof NextResponse) return admin;
    if (String(req.headers.get("x-user-role") || "").toUpperCase() !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const requestedDays = Number(req.nextUrl.searchParams.get("days") || 30);
    const days = [7, 30, 90].includes(requestedDays) ? requestedDays : 30;
    const companyId = req.nextUrl.searchParams.get("companyId") || null;
    const events = await prisma.activityLog.groupBy({
      by: ["companyId", "userId", "action"],
      where: {
        createdAt: { gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) },
        action: { startsWith: "CLIENT_PAGE_VIEW:/dashboard" },
        companyId: companyId || { not: null },
      },
      _count: { _all: true },
      _max: { createdAt: true },
    });

    const companies = await prisma.company.findMany({
      where: { isDemo: false, isInternalTest: false, ...(companyId ? { id: companyId } : {}) },
      select: { id: true, companyNo: true, name: true, country: true, plan: true },
    });
    const companyMap = new Map(companies.map((company) => [company.id, company]));
    const byCompanyPage = new Map<string, { companyId: string; page: string; views: number; users: Set<string>; lastViewed: Date | null }>();
    for (const event of events) {
      if (!event.companyId || !companyMap.has(event.companyId)) continue;
      const page = event.action.slice("CLIENT_PAGE_VIEW:".length);
      const key = `${event.companyId}\u0000${page}`;
      const row = byCompanyPage.get(key) || { companyId: event.companyId, page, views: 0, users: new Set<string>(), lastViewed: null };
      row.views += event._count._all;
      if (event.userId) row.users.add(event.userId);
      if (event._max.createdAt && (!row.lastViewed || event._max.createdAt > row.lastViewed)) row.lastViewed = event._max.createdAt;
      byCompanyPage.set(key, row);
    }

    const rows = [...byCompanyPage.values()].map((row) => ({
      companyId: row.companyId,
      company: companyMap.get(row.companyId)!.name,
      companyNo: companyMap.get(row.companyId)!.companyNo,
      country: companyMap.get(row.companyId)!.country,
      plan: companyMap.get(row.companyId)!.plan,
      page: row.page,
      views: row.views,
      users: row.users.size,
      lastViewed: row.lastViewed?.toISOString() || null,
    })).sort((a, b) => b.views - a.views);

    const companyRows = companies.map((company) => {
      const matching = rows.filter((row) => row.companyId === company.id);
      const activeUsers = new Set(events.filter((event) => event.companyId === company.id && event.userId).map((event) => event.userId));
      return {
        id: company.id, companyNo: company.companyNo, name: company.name, country: company.country, plan: company.plan,
        views: matching.reduce((sum, row) => sum + row.views, 0),
        users: activeUsers.size,
        pages: matching.length,
      };
    }).sort((a, b) => b.views - a.views || a.name.localeCompare(b.name));

    return NextResponse.json({ days, rows, companies: companyRows });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to load page usage" }, { status: 500 });
  }
}
