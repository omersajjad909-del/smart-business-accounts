/**
 * lib/currency.ts
 * Live FX rates, conversion utilities, and per-company base currency.
 *
 * Rate source: https://api.exchangerate-api.com/v4/latest/USD (free, no key)
 * Cache strategy: 5-minute in-memory TTL + 1-hour ActivityLog persistence
 */

import { prisma } from "@/lib/prisma";

// ── Constants ─────────────────────────────────────────────────────────────────

export const BASE_CURRENCY = "USD";

export const SUPPORTED_CURRENCIES = [
  "USD", "EUR", "GBP", "CAD", "AUD", "JPY", "CHF", "SGD", "INR", "AED",
  "SAR", "PKR", "MYR", "NZD", "HKD", "NOK", "SEK", "DKK", "ZAR", "BRL",
  "MXN", "KRW", "TWD", "IDR", "THB", "VND", "PHP", "NGN", "EGP", "TRY",
];

export const CURRENCY_NAMES: Record<string, string> = {
  USD: "US Dollar",       EUR: "Euro",                GBP: "British Pound",
  CAD: "Canadian Dollar", AUD: "Australian Dollar",   JPY: "Japanese Yen",
  CHF: "Swiss Franc",     SGD: "Singapore Dollar",    INR: "Indian Rupee",
  AED: "UAE Dirham",      SAR: "Saudi Riyal",         PKR: "Pakistani Rupee",
  MYR: "Malaysian Ringgit", NZD: "New Zealand Dollar", HKD: "Hong Kong Dollar",
  NOK: "Norwegian Krone", SEK: "Swedish Krona",       DKK: "Danish Krone",
  ZAR: "South African Rand", BRL: "Brazilian Real",   MXN: "Mexican Peso",
  KRW: "South Korean Won", TWD: "Taiwan Dollar",      IDR: "Indonesian Rupiah",
  THB: "Thai Baht",       VND: "Vietnamese Dong",     PHP: "Philippine Peso",
  NGN: "Nigerian Naira",  EGP: "Egyptian Pound",      TRY: "Turkish Lira",
};

export const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",   EUR: "€",    GBP: "£",    CAD: "CA$",  AUD: "A$",
  JPY: "¥",   CHF: "CHF",  SGD: "S$",   INR: "₹",    AED: "د.إ",
  SAR: "ر.س", PKR: "₨",    MYR: "RM",   NZD: "NZ$",  HKD: "HK$",
  NOK: "kr",  SEK: "kr",   DKK: "kr",   ZAR: "R",    BRL: "R$",
  MXN: "MX$", KRW: "₩",    TWD: "NT$",  IDR: "Rp",   THB: "฿",
  VND: "₫",   PHP: "₱",    NGN: "₦",    EGP: "E£",   TRY: "₺",
};

/** Hardcoded fallback rates (vs USD) used only when the API is unreachable. */
const FALLBACK_RATES: Record<string, number> = {
  USD: 1,      EUR: 0.92,   GBP: 0.79,   CAD: 1.36,   AUD: 1.53,
  JPY: 157,    CHF: 0.90,   SGD: 1.34,   INR: 83.5,   AED: 3.67,
  SAR: 3.75,   PKR: 278,    MYR: 4.71,   NZD: 1.66,   HKD: 7.82,
  NOK: 10.6,   SEK: 10.5,   DKK: 6.88,   ZAR: 18.4,   BRL: 5.1,
  MXN: 17.2,   KRW: 1330,   TWD: 32.1,   IDR: 16100,  THB: 36.5,
  VND: 25500,  PHP: 56.5,   NGN: 1500,   EGP: 49,     TRY: 32.5,
};

// ── Aliases for backwards-compat (used by Pricing, onboarding, dashboard) ────

/** Alias for CURRENCY_SYMBOLS — e.g. CURRENCY_SYMBOL["USD"] === "$" */
export const CURRENCY_SYMBOL = CURRENCY_SYMBOLS;

/** Alias for CURRENCY_NAMES — e.g. CURRENCY_LABEL["USD"] === "US Dollar" */
export const CURRENCY_LABEL = CURRENCY_NAMES;

/** Sync fallback FX rates (USD-based) — used for client-side price display */
export const FX_USD = FALLBACK_RATES;

// ── Country → Currency mapping ────────────────────────────────────────────────

const COUNTRY_TO_CURRENCY: Record<string, string> = {
  US: "USD", PR: "USD", GU: "USD", VI: "USD",
  GB: "GBP",
  AU: "AUD",
  CA: "CAD",
  JP: "JPY",
  CH: "CHF", LI: "CHF",
  SG: "SGD",
  IN: "INR",
  AE: "AED",
  SA: "SAR", BH: "SAR", KW: "SAR", QA: "SAR", OM: "SAR",
  PK: "PKR",
  MY: "MYR",
  NZ: "NZD",
  HK: "HKD",
  NO: "NOK",
  SE: "SEK",
  DK: "DKK",
  ZA: "ZAR",
  BR: "BRL",
  MX: "MXN",
  KR: "KRW",
  TW: "TWD",
  ID: "IDR",
  TH: "THB",
  VN: "VND",
  PH: "PHP",
  NG: "NGN",
  EG: "EGP",
  TR: "TRY",
  DE: "EUR", FR: "EUR", IT: "EUR", ES: "EUR", NL: "EUR",
  BE: "EUR", AT: "EUR", PT: "EUR", IE: "EUR", FI: "EUR",
  GR: "EUR", LU: "EUR", MT: "EUR", CY: "EUR", SK: "EUR",
  SI: "EUR", EE: "EUR", LV: "EUR", LT: "EUR", HR: "EUR",
};

/** Maps a 2-letter ISO country code to a currency code, or null if unknown. */
export function currencyByCountry(countryCode: string): string | null {
  return COUNTRY_TO_CURRENCY[countryCode?.toUpperCase()] ?? null;
}

/** Picks a currency from the Accept-Language header (best-effort). */
export function pickCurrencyByAcceptLanguage(acceptLanguage: string | null): string | null {
  if (!acceptLanguage) return null;
  const primaryTag = acceptLanguage.split(",")[0].split(";")[0].trim();
  const regionCode  = primaryTag.split("-")[1]?.toUpperCase();
  return regionCode ? currencyByCountry(regionCode) : null;
}

/**
 * Synchronously convert a USD amount to a target currency and format it.
 * Uses hardcoded fallback rates — suitable for client-side price display.
 */
export function formatFromUSD(usdAmount: number, currency: string): string {
  const rate      = FALLBACK_RATES[currency] ?? 1;
  const converted = Math.round(usdAmount * rate * 100) / 100;
  return formatCurrency(converted, currency);
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ExchangeRates {
  base: string;
  rates: Record<string, number>;
  updatedAt: string;
}

export interface ConversionResult {
  originalAmount: number;
  originalCurrency: string;
  convertedAmount: number;
  targetCurrency: string;
  rate: number;
  rateSource: string;
  convertedAt: string;
}

// ── In-memory cache (5-minute TTL) ────────────────────────────────────────────

const MEM_TTL_MS = 5 * 60 * 1000;       // 5 minutes
const LOG_TTL_MS = 60 * 60 * 1000;      // 1 hour

let ratesCache: { rates: ExchangeRates; expiresAt: number } | null = null;

// ── Core: getExchangeRates ─────────────────────────────────────────────────────

/**
 * Returns live USD-based exchange rates.
 * 1. Checks in-memory cache (5-minute TTL)
 * 2. Checks ActivityLog for a recent cache row (1-hour TTL)
 * 3. Fetches from exchangerate-api.com
 * 4. Falls back to hardcoded FALLBACK_RATES on any failure
 */
export async function getExchangeRates(): Promise<ExchangeRates> {
  const now = Date.now();

  // 1 — memory hit
  if (ratesCache && now < ratesCache.expiresAt) {
    return ratesCache.rates;
  }

  // 2 — ActivityLog hit (within 1 hour)
  try {
    const logEntry = await prisma.activityLog.findFirst({
      where: {
        action: "FX_RATES_CACHE",
        createdAt: { gte: new Date(now - LOG_TTL_MS) },
      },
      orderBy: { createdAt: "desc" },
    });

    if (logEntry?.details) {
      const parsed: ExchangeRates = JSON.parse(logEntry.details);
      if (parsed?.rates && Object.keys(parsed.rates).length > 0) {
        ratesCache = { rates: parsed, expiresAt: now + MEM_TTL_MS };
        return parsed;
      }
    }
  } catch {
    // DB unavailable — proceed to fetch
  }

  // 3 — Live fetch
  try {
    const response = await fetch("https://api.exchangerate-api.com/v4/latest/USD", {
      next: { revalidate: 300 },   // Next.js ISR hint
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    const rates: ExchangeRates = {
      base: "USD",
      rates: data.rates as Record<string, number>,
      updatedAt: new Date().toISOString(),
    };

    // Cache in memory
    ratesCache = { rates, expiresAt: now + MEM_TTL_MS };

    // Persist to ActivityLog (fire-and-forget)
    prisma.activityLog
      .create({
        data: {
          action: "FX_RATES_CACHE",
          details: JSON.stringify(rates),
        },
      })
      .catch(() => {});

    return rates;
  } catch (err) {
    console.error("[currency] FX fetch failed:", err);
  }

  // 4 — Fallback
  const fallback: ExchangeRates = {
    base: "USD",
    rates: FALLBACK_RATES,
    updatedAt: new Date().toISOString(),
  };

  // Still populate memory cache so we don't hammer the API on every request
  ratesCache = { rates: fallback, expiresAt: now + MEM_TTL_MS };
  return fallback;
}

// ── Core: convertCurrency ─────────────────────────────────────────────────────

/**
 * Convert an amount from one currency to another.
 * Both conversions go through USD as the pivot.
 */
export async function convertCurrency(
  amount: number,
  from: string,
  to: string,
): Promise<ConversionResult> {
  if (from === to) {
    return {
      originalAmount: amount,
      originalCurrency: from,
      convertedAmount: amount,
      targetCurrency: to,
      rate: 1,
      rateSource: "same-currency",
      convertedAt: new Date().toISOString(),
    };
  }

  const { rates, updatedAt } = await getExchangeRates();

  // Rates are all relative to USD; pivot through USD
  const fromRate = rates[from] ?? FALLBACK_RATES[from] ?? 1;
  const toRate   = rates[to]   ?? FALLBACK_RATES[to]   ?? 1;

  // from → USD → to
  const amountInUSD = amount / fromRate;
  const converted   = amountInUSD * toRate;
  const directRate  = toRate / fromRate;

  return {
    originalAmount:    amount,
    originalCurrency:  from,
    convertedAmount:   Math.round(converted * 10000) / 10000,
    targetCurrency:    to,
    rate:              Math.round(directRate * 10000) / 10000,
    rateSource:        `exchangerate-api.com (${updatedAt})`,
    convertedAt:       new Date().toISOString(),
  };
}

// ── Core: formatCurrency ──────────────────────────────────────────────────────

/**
 * Format an amount with full Intl currency formatting.
 * Falls back to symbol + number on unsupported currencies.
 */
export function formatCurrency(
  amount: number,
  currency: string,
  locale = "en-US",
): string {
  try {
    return new Intl.NumberFormat(locale, {
      style:                 "currency",
      currency:              currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    const symbol = CURRENCY_SYMBOLS[currency] ?? currency + " ";
    return `${symbol}${amount.toLocaleString(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
}

// ── Company base currency ─────────────────────────────────────────────────────

/**
 * Returns the base currency for a company.
 * First checks ActivityLog overrides, then falls back to Company.baseCurrency,
 * then defaults to "USD".
 */
export async function getCompanyBaseCurrency(companyId: string): Promise<string> {
  // 1 — check ActivityLog preference override
  try {
    const entry = await prisma.activityLog.findFirst({
      where: { action: "COMPANY_BASE_CURRENCY", companyId },
      orderBy: { createdAt: "desc" },
    });
    if (entry?.details) {
      const parsed = JSON.parse(entry.details) as { currency?: string };
      if (parsed?.currency && SUPPORTED_CURRENCIES.includes(parsed.currency)) {
        return parsed.currency;
      }
    }
  } catch (err) {
    console.error("[currency] getCompanyBaseCurrency ActivityLog error:", err);
  }

  // 2 — fall back to Company record
  try {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { baseCurrency: true },
    });
    if (company?.baseCurrency) return company.baseCurrency;
  } catch (err) {
    console.error("[currency] getCompanyBaseCurrency Company error:", err);
  }

  return "USD";
}

/**
 * Store (or override) the base currency for a company in ActivityLog.
 */
export async function setCompanyBaseCurrency(
  companyId: string,
  currency: string,
): Promise<void> {
  if (!SUPPORTED_CURRENCIES.includes(currency)) {
    throw new Error(`Unsupported currency: ${currency}`);
  }

  try {
    await prisma.activityLog.create({
      data: {
        action:    "COMPANY_BASE_CURRENCY",
        companyId,
        details:   JSON.stringify({ currency }),
      },
    });
  } catch (err) {
    console.error("[currency] setCompanyBaseCurrency error:", err);
    throw err;
  }
}

/**
 * Convert an amount from a given currency to the company's base currency.
 */
export async function convertToBaseCurrency(
  amount: number,
  currency: string,
  companyId: string,
): Promise<number> {
  const baseCurrency = await getCompanyBaseCurrency(companyId);
  if (currency === baseCurrency) return amount;
  const result = await convertCurrency(amount, currency, baseCurrency);
  return result.convertedAmount;
}
