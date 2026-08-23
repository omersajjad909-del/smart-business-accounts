import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchLemonOrders, revenueForMonth } from "@/lib/lemonRevenue";
import { requireAdmin } from "@/lib/adminAuth";

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    if (admin instanceof NextResponse) return admin;
    const role = String(req.headers.get("x-user-role") || "").toUpperCase();
    if (role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Count active companies by plan.
    // Demo sandboxes are created as plan ENTERPRISE / subscriptionStatus ACTIVE
    // (see lib/demoSandbox.ts) so the visitor can walk the whole product — with
    // no isDemo filter here they were counted as paying Enterprise customers and
    // inflated both "Active Accounts" and the Enterprise KPI. isActive:false
    // covers purged/deactivated shells kept for the audit trail.
    const activeCompanies = await prisma.company.groupBy({
      by: ["plan"],
      _count: { plan: true },
      where: { subscriptionStatus: "ACTIVE", isDemo: false, isActive: true },
    } as any);

    // MRR straight from Lemon Squeezy — see lib/lemonRevenue.ts for why the
    // ActivityLog-derived version kept reporting the wrong figure.
    let mrr = 0;
    const orders = await fetchLemonOrders();
    if (orders) {
      mrr = revenueForMonth(orders);
    } else {
      // Lemon Squeezy unreachable or unconfigured — fall back to our own log.
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      const payments = await prisma.activityLog.findMany({
        where: { action: "PAYMENT_EVENT", createdAt: { gte: monthStart } },
        select: { details: true },
      });
      const seen = new Set<string>();
      for (const p of payments) {
        try {
          const det = p.details ? JSON.parse(p.details) : null;
          if (!det) continue;
          const status = det.status ? String(det.status).toLowerCase() : null;
          if (status && status !== "succeeded" && status !== "paid") continue;
          // order_created and subscription_payment_success both log the same
          // payment; count each order once.
          const key = String(det.orderId || "");
          if (key && seen.has(key)) continue;
          if (key) seen.add(key);
          const amt = Number(det.amount ?? det.amount_paid ?? 0);
          if (Number.isFinite(amt) && amt > 0) mrr += amt / 100;
        } catch {}
      }
      mrr = Math.round(mrr * 100) / 100;
    }
    const arr = Math.round(mrr * 12 * 100) / 100;

    const countByPlan: Record<string, number> = {};
    activeCompanies.forEach((r: any) => {
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
