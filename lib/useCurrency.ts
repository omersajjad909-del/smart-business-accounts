"use client";
import { useEffect, useState } from "react";
import { CURRENCY_SYMBOL, currencyByCountry } from "./currency";

let _cached: string | null = null;

export function useCurrency(): string {
  const [symbol, setSymbol] = useState<string>(_cached || "Rs ");

  useEffect(() => {
    if (_cached) { setSymbol(_cached); return; }
    fetch("/api/me/company")
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d) return;
        const code = d.baseCurrency || currencyByCountry(d.country) || "USD";
        const sym = CURRENCY_SYMBOL[code] || code + " ";
        _cached = sym;
        setSymbol(sym);
      })
      .catch(() => {});
  }, []);

  return symbol;
}
