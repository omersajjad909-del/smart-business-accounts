import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function ym(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export async function GET(req: NextRequest) {
  try {
    const role = String(req.headers.get("x-user-role") || "").toUpperCase();
    if (role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Plan distribution (active companies)
    const active = await prisma.company.groupBy({
      by: ["plan"],
      _count: { plan: true },
      where: { subscriptionStatus: "ACTIVE" },
    } as any);
    const dist = Object.fromEntries(active.map((a: any) => [String(a.plan || "STARTER").toUpperCase(), a._count.plan || 0]));

    // MRR series (exact) from ActivityLog PAYMENT_EVENT status=succeeded
    const now = new Date();
    const months: string[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(ym(d));
    }

    const logs = await prisma.activityLog.findMany({
      where: { action: "PAYMENT_EVENT" },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true, details: true },
    });
    const mrrMap: Record<string, number> = {};
    for (const l of logs) {
      let det: any;
      try { det = l.details ? JSON.parse(l.details) : null; } catch { det = null; }
      if (!det || String(det.status) !== "succeeded") continue;
      const key = ym(l.createdAt);
      if (!months.includes(key)) continue;
      const amt = Number(det.amount_paid || 0);
      // Convert to USD if known currencies
      const curr = String(det.currency || "USD").toUpperCase();
      const rate = curr === "USD" ? 1 : 1; // keep raw; currency normalization can be added later
      mrrMap[key] = (mrrMap[key] || 0) + amt * rate / 100; // Stripe cents→units
    }
    const series = months.map((label) => ({ label, value: Math.round((mrrMap[label] || 0)) }));

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
