import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminAuth";

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    if (admin instanceof NextResponse) return admin;
    const role = String(req.headers.get("x-user-role") || "").toUpperCase();
    if (role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [companies, sessions, activities, loginLogs] = await Promise.all([
      // Demo sandboxes are the busiest "companies" on the platform — they are
      // seeded with a full dataset and hit hard for a few minutes — so without
      // this filter they crowd real customers out of the top 10 entirely.
      prisma.company.findMany({
        where: { isDemo: false, isInternalTest: false },
        select: { id: true, companyNo: true, name: true, country: true, subscriptionStatus: true },
      }),
      prisma.session.groupBy({
        by: ["companyId"],
        _count: { id: true },
        where: { createdAt: { gte: since } },
      } as never),
      prisma.activityLog.groupBy({
        by: ["companyId"],
        _count: { id: true },
        where: { createdAt: { gte: since }, companyId: { not: null } },
      } as never),
      (prisma as unknown as { loginLog?: { groupBy?: (args: unknown) => Promise<Array<{ companyId: string; _count: { id: number } }>> } }).loginLog?.groupBy
        ? (prisma as unknown as { loginLog: { groupBy: (args: unknown) => Promise<Array<{ companyId: string; _count: { id: number } }>> } }).loginLog.groupBy({
            by: ["companyId"],
            _count: { id: true },
            where: { loginAt: { gte: since } },
          })
        : Promise.resolve([]),
    ]);

    const sessionCount = new Map<string, number>();
    const activityCount = new Map<string, number>();
    const loginCount = new Map<string, number>();

    for (const item of sessions as Array<{ companyId: string; _count: { id: number } }>) {
      sessionCount.set(item.companyId, item._count.id || 0);
    }
    for (const item of activities as Array<{ companyId: string | null; _count: { id: number } }>) {
      if (!item.companyId) continue;
      activityCount.set(item.companyId, item._count.id || 0);
    }
    for (const item of loginLogs as Array<{ companyId: string; _count: { id: number } }>) {
      loginCount.set(item.companyId, item._count.id || 0);
    }

    const rows = companies
      .filter((company) => !["CANCELLED", "INACTIVE"].includes(String(company.subscriptionStatus || "").toUpperCase()))
      .map((company) => {
        const sessions7d = sessionCount.get(company.id) || 0;
        const actions7d = activityCount.get(company.id) || 0;
        const logins7d = loginCount.get(company.id) || 0;
        return {
          id: company.id,
          companyNo: company.companyNo,
          name: company.name,
          country: company.country || null,
          activity: sessions7d + actions7d + logins7d,
          sessions7d,
          actions7d,
          logins7d,
        };
      })
      .filter((company) => company.activity > 0)
      .sort((a, b) => b.activity - a.activity)
      .slice(0, 10);

    return NextResponse.json({ rows });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load top active companies" },
      { status: 500 }
    );
  }
}
