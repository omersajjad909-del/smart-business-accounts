import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const role = String(req.headers.get("x-user-role") || "").toUpperCase();
    if (role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const days = Number(new URL(req.url).searchParams.get("days") || 14);
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [companies, sessionAgg, activityAgg, loginAgg] = await Promise.all([
      prisma.company.findMany({
        select: { id: true, name: true, plan: true, subscriptionStatus: true, createdAt: true },
      }),
      prisma.session.groupBy({
        by: ["companyId"],
        _max: { createdAt: true },
      } as never),
      prisma.activityLog.groupBy({
        by: ["companyId"],
        _max: { createdAt: true },
        where: { companyId: { not: null } },
      } as never),
      (prisma as unknown as { loginLog?: { groupBy?: (args: unknown) => Promise<Array<{ companyId: string; _max: { loginAt: Date | null } }>> } }).loginLog?.groupBy
        ? (prisma as unknown as { loginLog: { groupBy: (args: unknown) => Promise<Array<{ companyId: string; _max: { loginAt: Date | null } }>> } }).loginLog.groupBy({
            by: ["companyId"],
            _max: { loginAt: true },
          })
        : Promise.resolve([]),
    ]);

    const latestByCompany = new Map<string, Date | null>();

    const mergeLatest = (companyId: string | null | undefined, value: Date | null | undefined) => {
      if (!companyId || !value) return;
      const current = latestByCompany.get(companyId);
      if (!current || value > current) {
        latestByCompany.set(companyId, value);
      }
    };

    for (const item of sessionAgg as Array<{ companyId: string; _max: { createdAt: Date | null } }>) {
      mergeLatest(item.companyId, item._max.createdAt);
    }
    for (const item of activityAgg as Array<{ companyId: string | null; _max: { createdAt: Date | null } }>) {
      mergeLatest(item.companyId || undefined, item._max.createdAt);
    }
    for (const item of loginAgg as Array<{ companyId: string; _max: { loginAt: Date | null } }>) {
      mergeLatest(item.companyId, item._max.loginAt);
    }

    const rows = companies
      .map((company) => {
        const lastSeen = latestByCompany.get(company.id) || null;
        return {
          id: company.id,
          name: company.name,
          plan: company.plan || "STARTER",
          subscriptionStatus: company.subscriptionStatus || "ACTIVE",
          lastLogin: lastSeen,
          createdAt: company.createdAt,
        };
      })
      .filter((company) => {
        if (["CANCELLED", "INACTIVE"].includes(String(company.subscriptionStatus).toUpperCase())) {
          return false;
        }
        if (!company.lastLogin) {
          return company.createdAt < cutoff;
        }
        return company.lastLogin < cutoff;
      })
      .sort((a, b) => {
        const aTime = a.lastLogin ? new Date(a.lastLogin).getTime() : 0;
        const bTime = b.lastLogin ? new Date(b.lastLogin).getTime() : 0;
        return aTime - bTime;
      })
      .slice(0, 10);

    return NextResponse.json({ rows });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load at-risk companies" },
      { status: 500 }
    );
  }
}
