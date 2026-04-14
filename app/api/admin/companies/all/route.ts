import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, logAdminAction } from "@/lib/adminAuth";

export async function GET(req: NextRequest) {
  try {
    const admin = requireAdmin(req);
    if (admin instanceof NextResponse) return admin;
    const companies = await prisma.company.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        country: true,
        plan: true,
        activeModules: true,
        subscriptionStatus: true,
        stripeCustomerId: true,
        currentPeriodEnd: true,
        cancelledAt: true,
        dataRetentionUntil: true,
        createdAt: true,
        isActive: true,
        businessType: true,
      },
    });

    // Users count per company
    const userCounts = await prisma.userCompany.groupBy({
      by: ["companyId"],
      _count: { userId: true },
    } as any);
    const userCountMap = new Map(userCounts.map((u: any) => [u.companyId, u._count.userId]));

    // Last login per company
    const sessionAgg = await prisma.session.groupBy({
      by: ["companyId"],
      _max: { createdAt: true },
    } as any);
    const lastLoginMap = new Map(sessionAgg.map((s: any) => [s.companyId, s._max.createdAt]));

    // First linked user per company (admin role preferred) — email only, NO password
    const allLinks = await prisma.userCompany.findMany({
      select: {
        companyId: true,
        user: { select: { email: true, name: true, role: true } },
      },
      orderBy: { createdAt: "asc" },
    });
    // For each company pick ADMIN role user first, else first user
    const ownerMap = new Map<string, any>();
    for (const uc of allLinks as any[]) {
      const existing = ownerMap.get(uc.companyId);
      if (!existing || (uc.user?.role?.toUpperCase() === "ADMIN" && existing?.role?.toUpperCase() !== "ADMIN")) {
        ownerMap.set(uc.companyId, uc.user);
      }
    }

    // AI Health Score — lightweight proxy metrics per company
    // Score = weighted composite of: active users, recent logins, subscription health, module usage
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentSessions = await prisma.session.groupBy({
      by: ["companyId"],
      _count: { id: true },
      where: { createdAt: { gte: thirtyDaysAgo } },
    } as any);
    const recentSessionMap = new Map(recentSessions.map((s: any) => [s.companyId, s._count.id]));

    function computeAIScore(c: any, userCount: number, recentLogins: number): number {
      let score = 0;
      // Subscription health (35 pts)
      const status = (c.subscriptionStatus || "").toUpperCase();
      if (status === "ACTIVE") score += 35;
      else if (status === "TRIALING") score += 25;
      else if (status === "PAST_DUE") score += 10;
      // Plan tier (20 pts)
      const plan = (c.plan || "").toUpperCase();
      if (plan === "ENTERPRISE") score += 20;
      else if (plan === "PRO") score += 15;
      else if (plan === "STARTER") score += 10;
      // User engagement (25 pts)
      if (userCount >= 10) score += 25;
      else if (userCount >= 5) score += 18;
      else if (userCount >= 2) score += 10;
      else if (userCount >= 1) score += 5;
      // Recent activity (20 pts)
      if (recentLogins >= 50) score += 20;
      else if (recentLogins >= 20) score += 15;
      else if (recentLogins >= 5) score += 10;
      else if (recentLogins >= 1) score += 5;
      return Math.min(score, 100);
    }

    const rows = companies.map((c) => {
      const owner = ownerMap.get(c.id) as any;
      const userCount = userCountMap.get(c.id) || 0;
      const recentLogins = recentSessionMap.get(c.id) || 0;
      const aiScore = computeAIScore(c, userCount, recentLogins);
      const aiHealth = aiScore >= 75 ? "Healthy" : aiScore >= 50 ? "At Risk" : "Critical";
      return {
        ...c,
        usersCount: userCount,
        branches: 0,
        lastLogin: lastLoginMap.get(c.id) || null,
        ownerEmail: owner?.email || null,
        ownerName: owner?.name || null,
        aiScore,
        aiHealth,
        // ownerPassword intentionally omitted — never expose password hashes
      };
    });

    return NextResponse.json({ rows });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
