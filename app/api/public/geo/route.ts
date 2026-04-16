import { NextRequest, NextResponse } from "next/server";
import { currencyByCountry, pickCurrencyByAcceptLanguage } from "@/lib/currency";

export const runtime = "edge";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function readCountryFromHeaders(req: NextRequest): string | null {
  const headerCandidates = [
    req.headers.get("x-vercel-ip-country"),
    req.headers.get("cf-ipcountry"),
    req.headers.get("cloudfront-viewer-country"),
    req.headers.get("x-country-code"),
  ];

  for (const raw of headerCandidates) {
    const cc = String(raw || "").trim().toUpperCase();
    if (/^[A-Z]{2}$/.test(cc)) return cc;
  }

  return null;
}

export async function GET(req: NextRequest) {
  // Best-effort geo without external API calls:
  // 1) query override for testing: ?country=CN&currency=CNY
  // 2) IP-country headers from host/CDN
  // 3) Accept-Language fallback
  try {
    const { searchParams } = new URL(req.url);
    const overrideCurrency = String(searchParams.get("currency") || "").trim().toUpperCase() || null;
    const overrideCountry = String(searchParams.get("country") || "").trim().toUpperCase() || null;

    const ipCountry = readCountryFromHeaders(req);
    const acceptLanguage = req.headers.get("accept-language");

    const country = overrideCountry || ipCountry || "US";
    const currency =
      overrideCurrency ||
      currencyByCountry(country) ||
      pickCurrencyByAcceptLanguage(acceptLanguage) ||
      "USD";

    const response = NextResponse.json({
      country,
      currency,
      source: overrideCountry || overrideCurrency ? "query" : ipCountry ? "ip" : "accept-language",
    });
    response.headers.set("Cache-Control", "private, no-store, max-age=0");
    return response;
  } catch (e: unknown) {
    const response = NextResponse.json({
      country: "US",
      currency: "USD",
      source: "fallback",
      error: e instanceof Error ? e.message : "unknown",
    });
    response.headers.set("Cache-Control", "private, no-store, max-age=0");
    return response;
  }
}
