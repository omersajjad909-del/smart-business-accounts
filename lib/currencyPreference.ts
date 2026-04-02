"use client";

export const FINOVA_CURRENCY_KEY = "finova_currency";
export const FINOVA_COUNTRY_KEY = "finova_country";
export const FINOVA_CURRENCY_EVENT = "finova-currency-changed";

export type CurrencyPreference = {
  currency: string | null;
  country: string | null;
};

export function getStoredCurrencyPreference(): CurrencyPreference {
  if (typeof window === "undefined") {
    return { currency: null, country: null };
  }

  try {
    return {
      currency: window.localStorage.getItem(FINOVA_CURRENCY_KEY),
      country: window.localStorage.getItem(FINOVA_COUNTRY_KEY),
    };
  } catch {
    return { currency: null, country: null };
  }
}

export function setStoredCurrencyPreference(currency: string, country?: string | null) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(FINOVA_CURRENCY_KEY, currency);
    if (country) {
      window.localStorage.setItem(FINOVA_COUNTRY_KEY, country);
    }
    window.dispatchEvent(
      new CustomEvent(FINOVA_CURRENCY_EVENT, {
        detail: { currency, country: country || null },
      }),
    );
  } catch {}
}
