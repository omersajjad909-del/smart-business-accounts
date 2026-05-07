import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";
import { currencyByCountry } from "@/lib/currency";
import { getCompanyExtraSeats, getEffectiveUserLimitForCompany } from "@/lib/companySeatLimit";

function isDatabaseUnavailable(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientInitializationError) return true;
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("Can't reach database server");
}

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
        logoUrl: true,
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
    const extraSeats = await getCompanyExtraSeats(companyId);
    const effectiveUserLimit = await getEffectiveUserLimitForCompany(companyId, company.plan);

    const baseCurrency = company.baseCurrency || currencyByCountry(company.country);

    return NextResponse.json({
      ...company,
      baseCurrency,
      totalUsers: company?._count?.users ?? 0,
      totalAccounts: company?._count?.accounts ?? 0,
      introOfferClaimed: !!offerClaimed,
      extraSeats,
      effectiveUserLimit,
    });
  } catch (e: unknown) {
    if (isDatabaseUnavailable(e)) {
      const companyId = (await resolveCompanyId(req)) || "unknown";
      const country = "Pakistan";
      return NextResponse.json({
        id: companyId,
        name: "My Company",
        country,
        baseCurrency: currencyByCountry(country),
        plan: "STARTER",
        subscriptionStatus: "UNKNOWN",
        activeModules: null,
        currentPeriodEnd: null,
        stripeCustomerId: null,
        businessType: null,
        businessSetupDone: false,
        logoUrl: null,
        totalUsers: 0,
        totalAccounts: 0,
        introOfferClaimed: false,
        extraSeats: 0,
        effectiveUserLimit: null,
        degraded: true,
      }, {
        headers: { "x-finova-degraded": "company-db-unavailable" },
      });
    }
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
