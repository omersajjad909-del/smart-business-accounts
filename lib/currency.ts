import { COUNTRIES } from "@/lib/countries";

export const COUNTRY_TO_CURRENCY: Record<string, string> = {
  US: "USD",
  GB: "GBP",
  EU: "EUR",
  AE: "AED",
  SA: "SAR",
  QA: "QAR",
  KW: "KWD",
  OM: "OMR",
  PK: "PKR",
  IN: "INR",
  CN: "CNY",
  JP: "JPY",
  CA: "CAD",
  AU: "AUD",
  SG: "SGD",
  MY: "MYR",
  NZ: "NZD",
  CH: "CHF",
  ZA: "ZAR",
  NG: "NGN",
  EG: "EGP",
  BD: "BDT",
  LK: "LKR",
  NP: "NPR",
  KE: "KES",
  TR: "TRY",
  RU: "RUB",
  UA: "UAH",
  BR: "BRL",
  MX: "MXN",
  AR: "ARS",
  TH: "THB",
  ID: "IDR",
  PH: "PHP",
  VN: "VND",
};

export const CURRENCY_SYMBOL: Record<string, string> = {
  USD: "$",
  GBP: "GBP ",
  EUR: "EUR ",
  AED: "AED ",
  SAR: "SAR ",
  QAR: "QAR ",
  KWD: "KWD ",
  OMR: "OMR ",
  PKR: "PKR ",
  INR: "INR ",
  CNY: "CNY ",
  JPY: "JPY ",
  CAD: "CAD ",
  AUD: "AUD ",
  SGD: "SGD ",
  MYR: "MYR ",
  NZD: "NZD ",
  CHF: "CHF ",
  ZAR: "ZAR ",
  NGN: "NGN ",
  EGP: "EGP ",
  BDT: "BDT ",
  LKR: "LKR ",
  NPR: "NPR ",
  KES: "KES ",
  TRY: "TRY ",
  RUB: "RUB ",
  UAH: "UAH ",
  BRL: "BRL ",
  MXN: "MXN ",
  ARS: "ARS ",
  THB: "THB ",
  IDR: "IDR ",
  PHP: "PHP ",
  VND: "VND ",
};

export const SUPPORTED_CURRENCIES = [
  "USD",
  "GBP",
  "EUR",
  "AED",
  "SAR",
  "QAR",
  "KWD",
  "OMR",
  "PKR",
  "INR",
  "CNY",
  "JPY",
  "CAD",
  "AUD",
  "SGD",
  "MYR",
  "NZD",
  "CHF",
  "ZAR",
  "NGN",
  "EGP",
  "BDT",
  "LKR",
  "NPR",
  "KES",
  "TRY",
  "RUB",
  "UAH",
  "BRL",
  "MXN",
  "ARS",
  "THB",
  "IDR",
  "PHP",
  "VND",
] as const;

export const CURRENCY_LABEL: Record<string, string> = {
  USD: "US Dollar",
  GBP: "British Pound",
  EUR: "Euro",
  AED: "UAE Dirham",
  SAR: "Saudi Riyal",
  QAR: "Qatari Riyal",
  KWD: "Kuwaiti Dinar",
  OMR: "Omani Rial",
  PKR: "Pakistani Rupee",
  INR: "Indian Rupee",
  CNY: "Chinese Yuan",
  JPY: "Japanese Yen",
  CAD: "Canadian Dollar",
  AUD: "Australian Dollar",
  SGD: "Singapore Dollar",
  MYR: "Malaysian Ringgit",
  NZD: "New Zealand Dollar",
  CHF: "Swiss Franc",
  ZAR: "South African Rand",
  NGN: "Nigerian Naira",
  EGP: "Egyptian Pound",
  BDT: "Bangladeshi Taka",
  LKR: "Sri Lankan Rupee",
  NPR: "Nepalese Rupee",
  KES: "Kenyan Shilling",
  TRY: "Turkish Lira",
  RUB: "Russian Ruble",
  UAH: "Ukrainian Hryvnia",
  BRL: "Brazilian Real",
  MXN: "Mexican Peso",
  ARS: "Argentine Peso",
  THB: "Thai Baht",
  IDR: "Indonesian Rupiah",
  PHP: "Philippine Peso",
  VND: "Vietnamese Dong",
};

// Approx FX rates to 1 USD (static snapshot; update via admin if needed)
export const FX_USD: Record<string, number> = {
  USD: 1,
  GBP: 0.79,
  EUR: 0.92,
  AED: 3.67,
  SAR: 3.75,
  QAR: 3.64,
  KWD: 0.31,
  OMR: 0.38,
  PKR: 278,
  INR: 83,
  CNY: 7.1,
  JPY: 150,
  CAD: 1.35,
  AUD: 1.52,
  SGD: 1.34,
  MYR: 4.7,
  NZD: 1.66,
  CHF: 0.91,
  ZAR: 18.4,
  NGN: 1500,
  EGP: 49,
  BDT: 117,
  LKR: 300,
  NPR: 133,
  KES: 130,
  TRY: 32,
  RUB: 92,
  UAH: 40,
  BRL: 5.1,
  MXN: 17,
  ARS: 880,
  THB: 36,
  IDR: 16000,
  PHP: 56,
  VND: 25500,
};

export function pickCurrencyByAcceptLanguage(al: string | null | undefined): string {
  const s = String(al || "").toUpperCase();
  if (s.includes("CN") || s.startsWith("ZH")) return "CNY";
  if (s.includes("SA") || s.includes("AR-SA")) return "SAR";
  if (s.includes("AE") || s.includes("AR-AE")) return "AED";
  if (s.includes("QA") || s.includes("AR-QA")) return "QAR";
  if (s.includes("KW") || s.includes("AR-KW")) return "KWD";
  if (s.includes("OM") || s.includes("AR-OM")) return "OMR";
  if (s.includes("IN") || s.includes("HI-IN") || s.includes("EN-IN")) return "INR";
  if (s.includes("PK") || s.includes("UR-PK")) return "PKR";
  if (s.includes("GB")) return "GBP";
  if (s.includes("EU") || s.includes("DE") || s.includes("FR") || s.includes("ES") || s.includes("IT")) return "EUR";
  if (s.includes("JP")) return "JPY";
  return "USD";
}

export function convertFromUSD(amountUsd: number, currency: string): number {
  const rate = FX_USD[currency] || 1;
  return amountUsd * rate;
}

export function roundCurrencyAmount(amount: number, currency: string): number {
  const digits = ["JPY", "PKR", "INR"].includes(currency) ? 0 : 2;
  return Number(amount.toFixed(digits));
}

export function formatCurrencyAmount(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency,
      maximumFractionDigits: ["JPY", "PKR", "INR"].includes(currency) ? 0 : 2,
    }).format(amount);
  } catch {
    const symbol = CURRENCY_SYMBOL[currency] || `${currency} `;
    return `${symbol}${roundCurrencyAmount(amount, currency)}`;
  }
}

export function formatFromUSD(amountUsd: number, currency: string, rates?: Record<string, number> | null): string {
  const rate = rates?.[currency] || FX_USD[currency] || 1;
  return formatCurrencyAmount(amountUsd * rate, currency);
}

export function currencyByCountry(countryCode: string | null | undefined): string {
  const raw = String(countryCode || "").trim();
  if (!raw) return "USD";
  const byName = COUNTRIES.find((country) => country.name.toLowerCase() === raw.toLowerCase());
  const cc = (byName?.code || raw).toUpperCase();
  // Common eurozone/EEA country codes that should default to EUR.
  const euroCountryCodes = new Set([
    "AT", "BE", "CY", "DE", "EE", "ES", "FI", "FR", "GR", "HR", "IE", "IT",
    "LT", "LU", "LV", "MT", "NL", "PT", "SI", "SK",
  ]);
  if (euroCountryCodes.has(cc)) return "EUR";
  return COUNTRY_TO_CURRENCY[cc] || "USD";
}
