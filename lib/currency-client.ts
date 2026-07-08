"use client";
// Client-safe currency utilities — NO server/prisma imports

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

export const CURRENCY_SYMBOL = CURRENCY_SYMBOLS;
export const CURRENCY_LABEL  = CURRENCY_NAMES;

export const FX_USD: Record<string, number> = {
  USD: 1,      EUR: 0.92,   GBP: 0.79,   CAD: 1.36,   AUD: 1.53,
  JPY: 157,    CHF: 0.90,   SGD: 1.34,   INR: 83.5,   AED: 3.67,
  SAR: 3.75,   PKR: 278,    MYR: 4.71,   NZD: 1.66,   HKD: 7.82,
  NOK: 10.6,   SEK: 10.5,   DKK: 6.88,   ZAR: 18.4,   BRL: 5.1,
  MXN: 17.2,   KRW: 1330,   TWD: 32.1,   IDR: 16100,  THB: 36.5,
  VND: 25500,  PHP: 56.5,   NGN: 1500,   EGP: 49,     TRY: 32.5,
};

const COUNTRY_TO_CURRENCY: Record<string, string> = {
  US: "USD", PR: "USD", GU: "USD", VI: "USD",
  GB: "GBP", AU: "AUD", CA: "CAD", JP: "JPY",
  CH: "CHF", LI: "CHF", SG: "SGD", IN: "INR",
  AE: "AED", SA: "SAR", BH: "SAR", KW: "SAR", QA: "SAR", OM: "SAR",
  PK: "PKR", MY: "MYR", NZ: "NZD", HK: "HKD",
  NO: "NOK", SE: "SEK", DK: "DKK", ZA: "ZAR", BR: "BRL", MX: "MXN",
  KR: "KRW", TW: "TWD", ID: "IDR", TH: "THB", VN: "VND", PH: "PHP",
  NG: "NGN", EG: "EGP", TR: "TRY",
  DE: "EUR", FR: "EUR", IT: "EUR", ES: "EUR", NL: "EUR",
  BE: "EUR", AT: "EUR", PT: "EUR", IE: "EUR", FI: "EUR",
  GR: "EUR", LU: "EUR", MT: "EUR", CY: "EUR", SK: "EUR",
  SI: "EUR", EE: "EUR", LV: "EUR", LT: "EUR", HR: "EUR",
};

export function currencyByCountry(countryCode: string): string | null {
  return COUNTRY_TO_CURRENCY[countryCode?.toUpperCase()] ?? null;
}

export function pickCurrencyByAcceptLanguage(acceptLanguage: string | null): string | null {
  if (!acceptLanguage) return null;
  const primaryTag = acceptLanguage.split(",")[0].split(";")[0].trim();
  const regionCode  = primaryTag.split("-")[1]?.toUpperCase();
  return regionCode ? currencyByCountry(regionCode) : null;
}

export function formatCurrency(amount: number, currency: string, locale = "en-US"): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency", currency,
      minimumFractionDigits: 2, maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    const symbol = CURRENCY_SYMBOLS[currency] ?? currency + " ";
    return `${symbol}${amount.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
}

export function formatFromUSD(usdAmount: number, currency: string): string {
  const rate      = FX_USD[currency] ?? 1;
  const converted = Math.round(usdAmount * rate * 100) / 100;
  return formatCurrency(converted, currency);
}
