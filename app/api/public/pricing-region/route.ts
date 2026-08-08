import { NextRequest, NextResponse } from "next/server";
import { resolvePricingRegion } from "@/lib/geoCountry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/public/pricing-region
 *
 * The single answer to "what currency is this visitor priced in", used by the
 * marketing pricing page, the signup plan page and the checkout page so all
 * three agree with each other and with /api/billing/checkout.
 *
 * IP-only and deliberately un-overridable: no query params, no body, nothing
 * the browser can set. /api/billing/checkout runs the same resolver on the
 * same request, so the price shown is the price charged.
 */
export async function GET(req: NextRequest) {
  const region = resolvePricingRegion(req);

  const response = NextResponse.json({
    country: region.country,
    currency: region.currency,
    isPakistan: region.isPakistan,
    source: region.source,
    // Echoing the raw signals makes "why am I seeing the wrong currency?"
    // answerable by opening this URL, instead of guessing. All of it is the
    // caller's own request data.
    signals: region.signals,
  });
  // Per-visitor answer — must never be shared from a CDN cache.
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  return response;
}
