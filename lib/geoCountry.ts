import type { NextRequest } from "next/server";

/**
 * One rule for the whole product: the visitor's IP country decides the price
 * they see *and* the price they are charged.
 *
 *   Pakistan  → PKR, Lemon Squeezy `_PK` variants
 *   Elsewhere → USD, global variants
 *
 * There is no third currency and no user-facing switch. Every earlier bug in
 * this area came from letting the browser have an opinion — `?country=PK`, a
 * localStorage preference, or a 30-entry currency dropdown could each unlock
 * Pakistan's discounted price list from anywhere in the world, and the display
 * could disagree with what checkout actually charged.
 *
 * Trust order:
 *   1. CDN/edge IP headers — set by the platform, the browser cannot forge them.
 *   2. `company.country` — only when the edge gives us nothing (local dev, an
 *      unknown proxy). Keeps existing customers on their normal price.
 *   3. "US" — global pricing. Fail closed, never to the cheaper tier.
 *
 * A VPN does flip the result, by design: the user asked for IP to be the rule.
 * The backstop is Lemon Squeezy, which validates the card's own billing country
 * at checkout, so a spoofed region still has to survive the card.
 */

const GEO_HEADERS = [
  "x-vercel-ip-country",
  "cf-ipcountry",
  "cloudfront-viewer-country",
  "x-country-code",
] as const;

/** The only two currencies the product prices in. */
export type PricingCurrency = "PKR" | "USD";

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

export function pricingCurrencyForCountry(country: string | null | undefined): PricingCurrency {
  return normalizeCountry(country) === "PK" ? "PKR" : "USD";
}

export type PricingRegion = {
  /** Country pricing is computed from. Never client-supplied. */
  country: string;
  /** "PKR" for Pakistan, "USD" for everyone else. */
  currency: PricingCurrency;
  isPakistan: boolean;
  source: "geo" | "company" | "default";
};

export function resolvePricingRegion(
  req: NextRequest,
  companyCountry?: string | null,
): PricingRegion {
  const geo = readGeoCountryFromHeaders(req);
  const declared = normalizeCountry(companyCountry);

  const country = geo || declared || "US";
  const source: PricingRegion["source"] = geo ? "geo" : declared ? "company" : "default";

  return {
    country,
    currency: pricingCurrencyForCountry(country),
    isPakistan: country === "PK",
    source,
  };
}
