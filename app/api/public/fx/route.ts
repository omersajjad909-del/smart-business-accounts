import { NextRequest, NextResponse } from "next/server";

type Rates = Record<string, number>;

// In-memory cache (per server process)
let CACHE: { ts: number; rates: Rates } | null = null;
const TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
const SYMBOLS = ["USD","GBP","EUR","AED","SAR","QAR","KWD","OMR","PKR","INR","CNY","JPY"].join(",");

export async function GET(_req: NextRequest) {
  try {
    const now = Date.now();
    if (CACHE && now - CACHE.ts < TTL_MS) {
      return NextResponse.json({ base: "USD", rates: CACHE.rates, cached: true });
    }

    const url = `https://api.exchangerate.host/latest?base=USD&symbols=${encodeURIComponent(SYMBOLS)}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      // Graceful fallback
      return NextResponse.json({ base: "USD", rates: null, error: "upstream_failed" }, { status: 200 });
    }
    const data = await res.json();
    const rates: Rates = data?.rates || null;
    if (rates) {
      CACHE = { ts: now, rates };
    }
    return NextResponse.json({ base: "USD", rates });
  } catch (e: any) {
    return NextResponse.json({ base: "USD", rates: null, error: e.message }, { status: 200 });
  }
}
