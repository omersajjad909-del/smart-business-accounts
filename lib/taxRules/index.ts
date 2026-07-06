import type { TaxCountryEngine } from "./types";
import { PakistanTaxEngine } from "./pk";
import { UAETaxEngine } from "./ae";
import { SaudiTaxEngine } from "./sa";
import { IndiaTaxEngine } from "./in";
import { UKTaxEngine } from "./gb";
import { USTaxEngine } from "./us";

export type { TaxCountryEngine, TaxEngineInput, TaxReport, SlabBreakdown } from "./types";

const engines: TaxCountryEngine[] = [
  PakistanTaxEngine,
  UAETaxEngine,
  SaudiTaxEngine,
  IndiaTaxEngine,
  UKTaxEngine,
  USTaxEngine,
];

const BY_CODE = new Map(engines.map(e => [e.countryCode.toUpperCase(), e]));
const BY_CURRENCY = new Map(engines.flatMap(e => e.currencies.map(c => [c.toUpperCase(), e])));

const COUNTRY_NAME_MAP: Record<string, string> = {
  pakistan: "PK",
  "united arab emirates": "AE",
  uae: "AE",
  "saudi arabia": "SA",
  ksa: "SA",
  india: "IN",
  "united kingdom": "GB",
  uk: "GB",
  "united states": "US",
  "united states of america": "US",
  usa: "US",
};

export function getTaxEngine(country: string, currency: string): TaxCountryEngine | null {
  const code = COUNTRY_NAME_MAP[country.toLowerCase().trim()];
  if (code) return BY_CODE.get(code) ?? null;

  const byCurr = BY_CURRENCY.get(currency.toUpperCase().trim());
  if (byCurr) return byCurr;

  return BY_CODE.get(country.toUpperCase().trim()) ?? null;
}

export { engines as allTaxEngines };
