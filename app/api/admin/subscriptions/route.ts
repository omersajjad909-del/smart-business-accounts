import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, logAdminAction } from "@/lib/adminAuth";

export const runtime = "nodejs";

/**
 * List prices, used only when a company has never actually been charged.
 * The real figure comes from the last invoice — a Pakistan-region Starter
 * settles at ~$7.14, and reporting it as $49 overstated platform MRR by 7x.
 */
const MRR_MAP: Record<string, number> = {
  starter: 49,
  professional: 99,
  pro: 99,
  enterprise: 249,
};

function getListMrr(plan: string | null): number {
  if (!plan) return 0;
  return MRR_MAP[plan.toLowerCase()] ?? 0;
}

export async function GET(req: NextRequest) {
  try {
    const admin = requireAdmin(req);
    if (admin instanceof NextResponse) return admin;

    const companies = await prisma.company.findMany({
      select: {
        id: true,
        name: true,
        plan: true,
        subscriptionStatus: true,
        stripeCustomerId: true,
        currentPeriodEnd: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const userCounts = await prisma.userCompany.groupBy({
      by: ["companyId"],
      _count: { userId: true },
    });

    const userCountMap = new Map(
      userCounts.map((uc) => [uc.companyId, uc._count.userId])
    );

    // What each company was last actually charged, from the invoice ledger.
    const lastCharge = new Map<string, { total: number; currency: string }>();
    try {
      // `distinct` keeps only the first row per company under the ordering —
      // one row each rather than the whole ledger pulled back to be filtered.
      const rows = await (prisma as any).platformInvoice.findMany({
        where: { status: { in: ["PAID", "PARTIALLY_REFUNDED"] } },
        orderBy: { issuedAt: "desc" },
        distinct: ["companyId"],
        select: { companyId: true, total: true, currency: true },
      });
      for (const row of rows) {
        lastCharge.set(row.companyId, { total: Number(row.total) || 0, currency: row.currency });
      }
    } catch {
      // Ledger not migrated yet — fall back to list prices below.
    }

    const subscriptions = companies.map((c) => {
      const charged = lastCharge.get(c.id);
      return {
        id: c.id,
        name: c.name,
        plan: c.plan,
        status: c.subscriptionStatus,
        mrr: charged ? charged.total : getListMrr(c.plan),
        currency: charged?.currency || "USD",
        /** False when `mrr` is the plan's list price rather than a real charge. */
        mrrFromInvoice: Boolean(charged),
        currentPeriodEnd: c.currentPeriodEnd,
        userCount: userCountMap.get(c.id) ?? 0,
        createdAt: c.createdAt,
      };
    });

    return NextResponse.json({ subscriptions });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const admin = requireAdmin(req);
    if (admin instanceof NextResponse) return admin;

    const body = await req.json();
    const { id, action } = body as { id: string; action: string };

    if (!id || !action) {
      return NextResponse.json({ error: "id and action are required" }, { status: 400 });
    }

    let newStatus: string;
    if (action === "cancel") {
      newStatus = "CANCELLED";
    } else if (action === "activate") {
      newStatus = "ACTIVE";
    } else {
      return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    const company = await prisma.company.update({
      where: { id },
      data: { subscriptionStatus: newStatus },
      select: { id: true, name: true, subscriptionStatus: true },
    });

    return NextResponse.json({ company });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
