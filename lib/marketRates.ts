/**
 * Gold / oil / USD-PKR rates for the daily report email.
 *
 * Both sources are free, keyless public APIs — no provider account exists for
 * this yet, so there is no paid fallback. oilpriceapi.com's demo endpoint is
 * capped at 25 requests/day per IP, so the result is cached for hours rather
 * than fetched on every report. A failed or partial fetch degrades silently —
 * the report section is just dropped for whatever field didn't resolve,
 * rather than failing the whole email.
 */

export type MarketRates = {
  usdPkr: number | null;
  gold: number | null; // USD per troy ounce
  silver: number | null; // USD per troy ounce
  wtiOil: number | null; // USD per barrel
  brentOil: number | null; // USD per barrel
  asOf: string | null; // ISO instant the rates were fetched
};

const TTL_MS = 6 * 60 * 60 * 1000; // 6 hours — stays well under the 25/day cap
let CACHE: { ts: number; rates: MarketRates } | null = null;

async function fetchJson(url: string, timeoutMs = 8000): Promise<any | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal, cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function getMarketRates(): Promise<MarketRates> {
  if (CACHE && Date.now() - CACHE.ts < TTL_MS) return CACHE.rates;

  const [fx, commodities] = await Promise.all([
    fetchJson("https://open.er-api.com/v6/latest/USD"),
    fetchJson("https://api.oilpriceapi.com/v1/demo/prices"),
  ]);

  const prices: Array<{ code: string; price: number }> = commodities?.data?.prices || [];
  const byCode = (code: string) => prices.find((p) => p.code === code)?.price ?? null;

  const rates: MarketRates = {
    usdPkr: typeof fx?.rates?.PKR === "number" ? fx.rates.PKR : null,
    gold: byCode("GOLD_USD"),
    silver: byCode("SILVER_USD"),
    wtiOil: byCode("WTI_USD"),
    brentOil: byCode("BRENT_CRUDE_USD"),
    asOf: new Date().toISOString(),
  };

  // Cache even a partially-empty result — a flaky upstream shouldn't be
  // retried on every single report send within the TTL window.
  CACHE = { ts: Date.now(), rates };
  return rates;
}
