import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchLemonOrders, monthlySeries } from "@/lib/lemonRevenue";

function ym(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export async function GET(req: NextRequest) {
  try {
    const role = String(req.headers.get("x-user-role") || "").toUpperCase();
    if (role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Plan distribution (active companies). Demo sandboxes carry plan
    // ENTERPRISE + subscriptionStatus ACTIVE (lib/demoSandbox.ts), so they must
    // be excluded here the same way /api/admin/dashboard already does — they are
    // throwaway workspaces, not subscriptions.
    const active = await prisma.company.groupBy({
      by: ["plan"],
      _count: { plan: true },
      where: { subscriptionStatus: "ACTIVE", isDemo: false, isActive: true },
    } as any);
    const dist = Object.fromEntries(active.map((a: any) => [String(a.plan || "STARTER").toUpperCase(), a._count.plan || 0]));

    // MRR series (exact) from ActivityLog PAYMENT_EVENT status=succeeded
    const now = new Date();
    const months: string[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(ym(d));
    }

    // Prefer Lemon Squeezy's own numbers — it is the system that took the money.
    const lemonOrders = await fetchLemonOrders();
    if (lemonOrders) {
      return NextResponse.json({
        mrrSeries: monthlySeries(lemonOrders, 6),
        planDistribution: {
          starter: dist.STARTER || 0,
          pro: dist.PRO || 0,
          enterprise: dist.ENTERPRISE || 0,
        },
        source: "lemonsqueezy",
      });
    }

    const logs = await prisma.activityLog.findMany({
      where: { action: "PAYMENT_EVENT" },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true, details: true },
    });
    // order_created and subscription_payment_success both write a PAYMENT_EVENT
    // for one payment — counting both is what doubled $49 into $98.
    const seenOrders = new Set<string>();
    const mrrMap: Record<string, number> = {};
    for (const l of logs) {
      let det: any;
      try { det = l.details ? JSON.parse(l.details) : null; } catch { det = null; }
      if (!det) continue;

      // This used to require `det.status === "succeeded"` and read
      // `det.amount_paid` — the Stripe payload shape. The Lemon Squeezy webhook
      // that actually writes PAYMENT_EVENT records neither: it has no `status`
      // field and stores the figure under `amount`. So every real payment was
      // skipped on the first check and revenue sat at $0 with "No payment
      // events recorded yet", even with money in the Lemon Squeezy dashboard.
      // Accept both shapes: only reject a status when one is present and says
      // the charge did not succeed.
      const status = det.status ? String(det.status).toLowerCase() : null;
      if (status && status !== "succeeded" && status !== "paid") continue;

      const orderKey = String(det.orderId || "");
      if (orderKey && seenOrders.has(orderKey)) continue;
      if (orderKey) seenOrders.add(orderKey);

      const key = ym(l.createdAt);
      if (!months.includes(key)) continue;

      const rawAmount = Number(det.amount ?? det.amount_paid ?? 0);
      if (!Number.isFinite(rawAmount) || rawAmount <= 0) continue;

      // Both providers report minor units (cents / paisa).
      mrrMap[key] = (mrrMap[key] || 0) + rawAmount / 100;
    }
    // Kept to 2dp — rounding to whole units turned a $24.50 first sale into $25.
    const series = months.map((label) => ({
      label,
      value: Math.round((mrrMap[label] || 0) * 100) / 100,
    }));

    return NextResponse.json({
      mrrSeries: series,
      planDistribution: {
        starter: dist.STARTER || 0,
        pro: dist.PRO || 0,
        enterprise: dist.ENTERPRISE || 0,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
