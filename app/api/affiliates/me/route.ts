import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const affiliate = await prisma.affiliate.findUnique({
      where: { email: user.email },
      include: {
        conversions: { orderBy: { convertedAt: "desc" }, take: 50 },
        payouts: { orderBy: { createdAt: "desc" }, take: 20 },
      },
    });

    if (!affiliate) return NextResponse.json({ affiliate: null });

    const thisMonth = new Date().toISOString().slice(0, 7);
    const monthEarnings = affiliate.conversions
      .filter(c => c.convertedAt.toISOString().slice(0, 7) === thisMonth && c.status !== "PENDING")
      .reduce((s, c) => s + c.commissionAmt, 0);

    const lastMonth = new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().slice(0, 7);
    const lastMonthEarnings = affiliate.conversions
      .filter(c => c.convertedAt.toISOString().slice(0, 7) === lastMonth && c.status !== "PENDING")
      .reduce((s, c) => s + c.commissionAmt, 0);

    const clicksThisMonth = affiliate.totalReferrals; // proxy

    return NextResponse.json({
      affiliate: {
        ...affiliate,
        monthEarnings: Math.round(monthEarnings * 100) / 100,
        lastMonthEarnings: Math.round(lastMonthEarnings * 100) / 100,
        clicksThisMonth,
        conversionRate: affiliate.totalReferrals > 0
          ? Math.round((affiliate.activeReferrals / affiliate.totalReferrals) * 100)
          : 0,
        referralLink: `https://usefinova.app/?ref=${affiliate.trackingCode}`,
      },
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const body = await req.json() as { payoutMethod?: string; payoutDetails?: string };
    const affiliate = await prisma.affiliate.update({
      where: { email: user.email },
      data: { payoutMethod: body.payoutMethod, payoutDetails: body.payoutDetails },
    });

    return NextResponse.json({ success: true, affiliate });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}
