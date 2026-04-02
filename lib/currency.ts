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
  const cc = String(countryCode || "").toUpperCase();
  return COUNTRY_TO_CURRENCY[cc] || "USD";
}
