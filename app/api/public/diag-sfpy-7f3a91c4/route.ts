import { NextRequest, NextResponse } from "next/server";
import { resolvePricingRegion } from "@/lib/geoCountry";
import { hasSafepayConfig, isSafepayCheckoutEnabled } from "@/lib/safepay";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/public/diag-sfpy-7f3a91c4
 *
 * TEMPORARY. Answers one question during the Safepay merchant review: why did
 * /api/billing/checkout hand a Pakistani buyer to Lemon Squeezy instead of
 * Safepay? That branch is `isPkrCustomer && isSafepayCheckoutEnabled()`, and
 * from outside there is no way to tell which half was false — the deployment
 * just quietly bills in USD.
 *
 * Reports presence as booleans and never a value, so nothing here discloses a
 * key. The path carries a random segment only to keep it off obvious URL
 * guesses; it is not an authentication boundary.
 *
 * Delete this route once Safepay checkout is confirmed working.
 */
export async function GET(req: NextRequest) {
  const region = resolvePricingRegion(req);
  const rawFlag = process.env.SAFEPAY_CHECKOUT_ENABLED;

  return NextResponse.json(
    {
      wouldUseSafepay: region.isPakistan && isSafepayCheckoutEnabled(),
      isPkrCustomer: region.isPakistan,
      isSafepayCheckoutEnabled: isSafepayCheckoutEnabled(),
      hasSafepayConfig: hasSafepayConfig(),
      env: {
        SAFEPAY_API_KEY_present: Boolean(process.env.SAFEPAY_API_KEY?.trim()),
        SAFEPAY_WEBHOOK_SECRET_present: Boolean(process.env.SAFEPAY_WEBHOOK_SECRET?.trim()),
        SAFEPAY_ENVIRONMENT: process.env.SAFEPAY_ENVIRONMENT?.trim() || null,
        // The exact flag matters: a stray quote or capital T fails the
        // === "true" test while looking correct in the Vercel UI.
        SAFEPAY_CHECKOUT_ENABLED_raw: rawFlag === undefined ? null : JSON.stringify(rawFlag),
      },
      commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 8) || null,
      vercelEnv: process.env.VERCEL_ENV || null,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
