import type { NextRequest } from "next/server";

/**
 * Server-side country resolution for *pricing* decisions.
 *
 * Anything the browser sends (request body, query string, localStorage) is
 * attacker-controlled: `/onboarding/payment/starter?country=PK` used to flow
 * straight through to Lemon Squeezy variant selection, so any visitor in the
 * world could hand themselves the discounted Pakistan price. Pricing must
 * therefore never read the client's claimed country.
 *
 * Trust order:
 *   1. `company.country` — declared once at signup, stored in our DB, tied to
 *      the account and auditable. A travelling Pakistani business keeps its
 *      regional price; a visitor cannot change it per-request.
 *   2. CDN/edge IP geo headers — set by the platform, not forgeable by the
 *      browser. Used when the company has no country on record.
 *   3. "US" — full global pricing. Fail closed, never to the cheaper tier.
 */

const GEO_HEADERS = [
  "x-vercel-ip-country",
  "cf-ipcountry",
  "cloudfront-viewer-country",
  "x-country-code",
] as const;

export function readGeoCountryFromHeaders(req: NextRequest): string | null {
  for (const header of GEO_HEADERS) {
    const cc = String(req.headers.get(header) || "").trim().toUpperCase();
    if (/^[A-Z]{2}$/.test(cc)) return cc;
  }
  return null;
}

function normalizeCountry(value: string | null | undefined): string | null {
  const cc = String(value || "").trim().toUpperCase();
  return /^[A-Z]{2}$/.test(cc) ? cc : null;
}

export type PricingCountry = {
  /** The country pricing is actually computed from. Never client-supplied. */
  country: string;
  source: "company" | "geo" | "default";
  /** Edge-detected country, kept for fraud review. */
  geoCountry: string | null;
  /**
   * True when the account's declared country and the edge geo disagree. Not a
   * blocker on its own (VPNs and travel are normal) but worth logging so the
   * fraud module can review discounted-region signups from elsewhere.
   */
  geoMismatch: boolean;
};

export function resolvePricingCountry(
  req: NextRequest,
  companyCountry: string | null | undefined,
): PricingCountry {
  const geoCountry = readGeoCountryFromHeaders(req);
  const declared = normalizeCountry(companyCountry);

  const country = declared || geoCountry || "US";
  const source: PricingCountry["source"] = declared ? "company" : geoCountry ? "geo" : "default";

  return {
    country,
    source,
    geoCountry,
    geoMismatch: Boolean(declared && geoCountry && declared !== geoCountry),
  };
}
