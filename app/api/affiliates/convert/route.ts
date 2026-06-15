import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// Called when a referred user signs up & subscribes
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      trackingCode: string;
      customerEmail: string;
      customerName?: string;
      plan?: string;
      planAmount?: number;
      companyId?: string;
    };

    if (!body.trackingCode || !body.customerEmail) {
      return NextResponse.json({ error: "trackingCode and customerEmail required" }, { status: 400 });
    }

    const affiliate = await prisma.affiliate.findUnique({ where: { trackingCode: body.trackingCode } });
    if (!affiliate) return NextResponse.json({ error: "Affiliate not found" }, { status: 404 });
    if (affiliate.status !== "APPROVED") return NextResponse.json({ error: "Affiliate not active" }, { status: 400 });

    const commissionAmt = body.planAmount ? parseFloat((body.planAmount * affiliate.commissionRate).toFixed(2)) : 0;

    const [conversion] = await prisma.$transaction([
      prisma.affiliateConversion.create({
        data: {
          affiliateId: affiliate.id,
          customerEmail: body.customerEmail,
          customerName: body.customerName,
          plan: body.plan,
          planAmount: body.planAmount,
          commissionAmt,
          companyId: body.companyId,
          status: "CONFIRMED",
        },
      }),
      prisma.affiliate.update({
        where: { id: affiliate.id },
        data: {
          totalReferrals: { increment: 1 },
          activeReferrals: { increment: 1 },
          totalEarned: { increment: commissionAmt },
          pendingBalance: { increment: commissionAmt },
          // Auto-upgrade tier based on activeReferrals
          tier: affiliate.activeReferrals + 1 >= 50 ? "ELITE"
              : affiliate.activeReferrals + 1 >= 21 ? "PRO"
              : affiliate.activeReferrals + 1 >= 6  ? "GROWTH"
              : "STARTER",
          commissionRate: affiliate.activeReferrals + 1 >= 50 ? 0.35
                        : affiliate.activeReferrals + 1 >= 21 ? 0.30
                        : affiliate.activeReferrals + 1 >= 6  ? 0.25
                        : 0.20,
        },
      }),
    ]);

    return NextResponse.json({ success: true, conversion, commissionAmt });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}
