import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, logAdminAction } from "@/lib/adminAuth";

export const runtime = "nodejs";

const MRR_MAP: Record<string, number> = {
  starter: 49,
  pro: 99,
  enterprise: 249,
};

function getMrr(plan: string | null): number {
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

    const subscriptions = companies.map((c) => ({
      id: c.id,
      name: c.name,
      plan: c.plan,
      status: c.subscriptionStatus,
      mrr: getMrr(c.plan),
      currentPeriodEnd: c.currentPeriodEnd,
      userCount: userCountMap.get(c.id) ?? 0,
      createdAt: c.createdAt,
    }));

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
