import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";
import { apiOk } from "@/lib/apiError";
import { resolvePricingCountry } from "@/lib/geoCountry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/billing/pricing-region
 *
 * The single source of truth for "which region's prices may this visitor be
 * shown". /api/billing/checkout already resolves this server-side before
 * picking a Lemon Squeezy variant; this endpoint exposes the same answer to
 * the UI so the price on screen matches the price actually charged.
 *
 * Without it the payment page decided regional pricing from `?country=` /
 * localStorage, so a visitor could be shown the discounted Pakistan price and
 * then be charged the full global one at checkout.
 */
export async function GET(req: NextRequest) {
  const companyId = await resolveCompanyId(req);

  const company =
    companyId && companyId !== "system"
      ? await prisma.company.findUnique({
          where: { id: companyId },
          select: { country: true, baseCurrency: true },
        })
      : null;

  const region = resolvePricingCountry(req, company?.country);

  return apiOk({
    country: region.country,
    source: region.source,
    // Regional (non-FX) pricing is only offered where we can vouch for the
    // region server-side. Everyone else sees global pricing.
    regionalPricingAllowed: region.country === "PK" || company?.baseCurrency === "PKR",
    baseCurrency: company?.baseCurrency || null,
  });
}
