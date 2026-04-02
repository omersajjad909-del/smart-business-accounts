import { NextRequest, NextResponse } from "next/server";
import { pickCurrencyByAcceptLanguage } from "@/lib/currency";

export async function GET(req: NextRequest) {
  // Best-effort geo without external call:
  // 1) query override: ?country=CN&currency=CNY for testing
  // 2) Accept-Language heuristic → currency
  try {
    const { searchParams } = new URL(req.url);
    const overrideCurrency = searchParams.get("currency");
    const overrideCountry = searchParams.get("country");

    const al = req.headers.get("accept-language");
    const cur = overrideCurrency || pickCurrencyByAcceptLanguage(al);
    // country is approximate; if override not provided, derive from currency
    const currencyToCountry: Record<string, string> = {
      USD: "US",
      GBP: "GB",
      EUR: "EU",
      AED: "AE",
      SAR: "SA",
      QAR: "QA",
      KWD: "KW",
      OMR: "OM",
      PKR: "PK",
      INR: "IN",
      CNY: "CN",
      JPY: "JP",
    };
    const country = overrideCountry || currencyToCountry[cur] || "US";
    return NextResponse.json({ country, currency: cur });
  } catch (e: any) {
    return NextResponse.json({ country: "US", currency: "USD", error: e.message });
  }
}
