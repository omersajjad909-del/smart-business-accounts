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

/**
 * Second opinion on "is this visitor in Pakistan", read from the browser's
 * own locale (`ur`, `ur-PK`, `en-PK`, …).
 *
 * Needed because IP geolocation is measurably wrong for our main market:
 * Pakistani ISPs route international traffic through transit carriers, and
 * Vercel resolves a good deal of that address space to the carrier's country
 * (Oman) rather than Pakistan. Verified live — a Karachi connection with no
 * VPN reported `OM`. Trusting the IP alone quoted real Pakistani customers the
 * full USD price, which is the expensive kind of wrong.
 *
 * The locale is set by the user's own OS/browser and does not change when they
 * connect through a VPN, so it corrects the false negatives that IP lookup
 * produces without inventing new ones.
 */
export function acceptLanguageIndicatesPakistan(req: NextRequest): boolean {
  const header = req.headers.get("accept-language") || "";
  // Matches a `-PK` region on any language tag, or Urdu with no region.
  return /(?:^|[,\s])(?:[a-z]{2,3}-PK|ur)(?:[;,\s]|$)/i.test(header);
}

/**
 * Third opinion: the device's own time zone, sent by the page as
 * `x-client-timezone`.
 *
 * The locale check above was meant to rescue Pakistani visitors whose IP
 * resolves abroad, but it misses most of them — a Pakistani SME almost always
 * runs the browser in plain `en-US`, so `accept-language` carries no `-PK` at
 * all. Their clock, on the other hand, is set to Karachi. Measured on a real
 * Karachi connection: the edge reported `SG` and the locale said nothing, while
 * the time zone said `Asia/Karachi`.
 *
 * Client-supplied, like `accept-language` — and trusted on the same terms. It
 * can only ever move a visitor *into* Pakistan pricing, which is the cheaper
 * tier, and the money still has to clear Safepay's Pakistani payment methods,
 * so a spoofed zone buys a discounted display and nothing else.
 */
const PAKISTAN_TIMEZONES = new Set(["asia/karachi"]);

/** Cookie written once per visit by <ClientRegionSignal>. */
export const CLIENT_TZ_COOKIE = "fx_tz";

export function timezoneIndicatesPakistan(req: NextRequest): boolean {
  // A cookie rather than a per-fetch header on purpose: it rides along on every
  // request automatically, including the POST to /api/billing/checkout. If the
  // signal reached the pricing display but not checkout, the page would quote
  // PKR and the card would be charged USD — the exact split this module exists
  // to prevent.
  const tz = String(
    req.headers.get("x-client-timezone") || req.cookies.get(CLIENT_TZ_COOKIE)?.value || "",
  )
    .trim()
    .toLowerCase();
  return PAKISTAN_TIMEZONES.has(tz);
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
  source: "geo" | "locale" | "timezone" | "company" | "default";
  /** Raw signals, for debugging a wrong currency without guesswork. */
  signals: {
    geoCountry: string | null;
    localeSaysPakistan: boolean;
    timezoneSaysPakistan: boolean;
    companyCountry: string | null;
  };
};

export function resolvePricingRegion(
  req: NextRequest,
  companyCountry?: string | null,
): PricingRegion {
  const geo = readGeoCountryFromHeaders(req);
  const localePK = acceptLanguageIndicatesPakistan(req);
  const tzPK = timezoneIndicatesPakistan(req);
  const declared = normalizeCountry(companyCountry);

  const signals = {
    geoCountry: geo,
    localeSaysPakistan: localePK,
    timezoneSaysPakistan: tzPK,
    companyCountry: declared,
  };

  // Pakistan wins on any single trustworthy signal, because the cost of a false
  // negative (a real Pakistani SME quoted the full USD price and leaving) is far
  // higher than the cost of a false positive (someone abroad with an Urdu locale
  // paying the local rate — the same leak a VPN already allows).
  if (geo === "PK") {
    return { country: "PK", currency: "PKR", isPakistan: true, source: "geo", signals };
  }
  if (localePK) {
    return { country: "PK", currency: "PKR", isPakistan: true, source: "locale", signals };
  }
  if (tzPK) {
    return { country: "PK", currency: "PKR", isPakistan: true, source: "timezone", signals };
  }
  if (declared === "PK") {
    return { country: "PK", currency: "PKR", isPakistan: true, source: "company", signals };
  }

  const country = geo || declared || "US";
  return {
    country,
    currency: pricingCurrencyForCountry(country),
    isPakistan: false,
    source: geo ? "geo" : declared ? "company" : "default",
    signals,
  };
}
