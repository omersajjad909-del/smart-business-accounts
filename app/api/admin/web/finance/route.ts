import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const role = String(req.headers.get("x-user-role") || "").toUpperCase();
    if (role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Count active companies by plan
    const activeCompanies = await prisma.company.groupBy({
      by: ["plan"],
      _count: { plan: true },
      where: { subscriptionStatus: "ACTIVE" },
    } as any);

    // Compute MRR from payment events (current month)
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const payments = await prisma.activityLog.findMany({
      where: { action: "PAYMENT_EVENT", createdAt: { gte: monthStart } },
      select: { details: true },
    });
    let mrr = 0;
    for (const p of payments) {
      try {
        const det = p.details ? JSON.parse(p.details) : null;
        if (!det || det.status !== "succeeded") continue;
        const amt = Number(det.amount_paid || 0);
        mrr += amt / 100; // stripe cents
      } catch {}
    }
    const arr = mrr * 12;

    const countByPlan: Record<string, number> = {};
    activeCompanies.forEach((r) => {
      const code = String(r.plan || "STARTER").toUpperCase();
      const cnt = (r as any)?._count?.plan ?? 0;
      countByPlan[code] = (countByPlan[code] || 0) + cnt;
    });

    const proCount = countByPlan.PRO || 0;
    const entCount = (countByPlan.ENTERPRISE || countByPlan.ENTERPRISES || 0); // tolerate typos
    const starterCount = countByPlan.STARTER || 0;

    return NextResponse.json({
      active: { starter: starterCount, pro: proCount, enterprise: entCount },
      mrr,
      arr,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
