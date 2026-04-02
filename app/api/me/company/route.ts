import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";
import { currencyByCountry } from "@/lib/currency";

export async function GET(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        name: true,
        country: true,
        baseCurrency: true,
        plan: true,
        subscriptionStatus: true,
        activeModules: true,
        currentPeriodEnd: true,
        stripeCustomerId: true,
        businessType: true,
        businessSetupDone: true,
        createdAt: true,
        _count: { select: { users: true, accounts: true } },
      },
    });

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const offerClaimed = await prisma.activityLog.findFirst({
      where: { companyId, action: "BILLING_OFFER_CLAIM" },
      select: { id: true },
    });

    const baseCurrency = (company as any).baseCurrency || currencyByCountry((company as any).country);

    return NextResponse.json({
      ...company,
      baseCurrency,
      totalUsers: company?._count?.users ?? 0,
      totalAccounts: company?._count?.accounts ?? 0,
      introOfferClaimed: !!offerClaimed,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
