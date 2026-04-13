import { COUNTRIES } from "@/lib/countries";

export type GeoPoint = { lat: number; lon: number };

export const COUNTRY_CENTERS: Record<string, GeoPoint> = {
  PK: { lat: 30.5, lon: 69.5 },
  AE: { lat: 24, lon: 54 },
  IN: { lat: 20.6, lon: 79 },
  SA: { lat: 24, lon: 45 },
  GB: { lat: 55, lon: -3 },
  US: { lat: 38, lon: -97 },
  BD: { lat: 23.7, lon: 90.4 },
  QA: { lat: 25.3, lon: 51.2 },
  TR: { lat: 39, lon: 35 },
  NG: { lat: 9, lon: 8 },
  EG: { lat: 26, lon: 30 },
  KE: { lat: -1, lon: 38 },
  ZA: { lat: -29, lon: 25 },
  AU: { lat: -25, lon: 134 },
  SG: { lat: 1.35, lon: 103.8 },
  MY: { lat: 4, lon: 109 },
  ID: { lat: -5, lon: 120 },
  PH: { lat: 13, lon: 122 },
  JP: { lat: 36, lon: 138 },
  CN: { lat: 35, lon: 105 },
  DE: { lat: 51.2, lon: 10.5 },
  FR: { lat: 46.2, lon: 2.2 },
  IT: { lat: 41.9, lon: 12.6 },
  ES: { lat: 40.5, lon: -3.7 },
  NL: { lat: 52.1, lon: 5.3 },
  CA: { lat: 56, lon: -106 },
  MX: { lat: 24, lon: -102 },
  BR: { lat: -14, lon: -51 },
  AR: { lat: -34, lon: -64 },
  CO: { lat: 4, lon: -72 },
  RU: { lat: 61, lon: 105 },
  KZ: { lat: 48, lon: 68 },
  IR: { lat: 32, lon: 53 },
  IQ: { lat: 33, lon: 44 },
  OM: { lat: 21, lon: 57 },
  KW: { lat: 29.3, lon: 47.7 },
  BH: { lat: 26, lon: 50.6 },
  YE: { lat: 15, lon: 48 },
  LK: { lat: 7.9, lon: 80.7 },
  NP: { lat: 28, lon: 84 },
  AF: { lat: 33, lon: 65 },
  UZ: { lat: 41, lon: 64 },
  AZ: { lat: 40.1, lon: 47.6 },
  GE: { lat: 42, lon: 43.5 },
  ZW: { lat: -20, lon: 30 },
  GH: { lat: 8, lon: -1 },
  ET: { lat: 9, lon: 39 },
  TZ: { lat: -6, lon: 35 },
  UG: { lat: 1, lon: 32 },
  MA: { lat: 32, lon: -5 },
  TN: { lat: 34, lon: 9 },
  DZ: { lat: 28, lon: 3 },
  LY: { lat: 27, lon: 17 },
  SD: { lat: 15, lon: 30 },
  CL: { lat: -30, lon: -71 },
  PE: { lat: -10, lon: -76 },
  VE: { lat: 8, lon: -66 },
  EC: { lat: -2, lon: -77.5 },
  HK: { lat: 22.4, lon: 114 },
  TW: { lat: 23.7, lon: 121 },
  KR: { lat: 37, lon: 128 },
  VN: { lat: 16, lon: 108 },
  TH: { lat: 15, lon: 101 },
  MM: { lat: 17, lon: 96 },
  KH: { lat: 12.6, lon: 105 },
  LA: { lat: 18, lon: 103 },
  NZ: { lat: -41, lon: 174 },
  PL: { lat: 52, lon: 20 },
  SE: { lat: 62, lon: 15 },
  NO: { lat: 60, lon: 8 },
  DK: { lat: 56, lon: 10 },
  FI: { lat: 64, lon: 26 },
  CH: { lat: 47, lon: 8 },
  AT: { lat: 47.5, lon: 14 },
  BE: { lat: 50.5, lon: 4 },
  PT: { lat: 39.5, lon: -8 },
  GR: { lat: 39, lon: 22 },
  CZ: { lat: 50, lon: 15.5 },
  HU: { lat: 47, lon: 19 },
  RO: { lat: 46, lon: 25 },
  BG: { lat: 43, lon: 25 },
  UA: { lat: 49, lon: 31 },
  SK: { lat: 48.7, lon: 19.7 },
  HR: { lat: 45.1, lon: 15.5 },
  RS: { lat: 44, lon: 21 },
  BA: { lat: 44, lon: 17 },
  IL: { lat: 31.5, lon: 35 },
  JO: { lat: 31, lon: 36 },
  LB: { lat: 34, lon: 36 },
  SY: { lat: 35, lon: 38 },
};

const COUNTRY_NAME_TO_CODE = new Map(
  COUNTRIES.map((country) => [country.name.trim().toLowerCase(), country.code])
);

COUNTRY_NAME_TO_CODE.set("uae", "AE");
COUNTRY_NAME_TO_CODE.set("united arab emirates", "AE");
COUNTRY_NAME_TO_CODE.set("uk", "GB");
COUNTRY_NAME_TO_CODE.set("united kingdom", "GB");
COUNTRY_NAME_TO_CODE.set("usa", "US");
COUNTRY_NAME_TO_CODE.set("united states", "US");

export function normalizeCountryCode(country: string | null | undefined): string | null {
  if (!country) return null;
  const trimmed = String(country).trim();
  if (!trimmed) return null;
  if (trimmed.length === 2) return trimmed.toUpperCase();
  return COUNTRY_NAME_TO_CODE.get(trimmed.toLowerCase()) || null;
}

export function getCountryCenter(country: string | null | undefined): GeoPoint | null {
  const code = normalizeCountryCode(country);
  if (!code) return null;
  return COUNTRY_CENTERS[code] || null;
}

export function isFiniteCoordinate(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

