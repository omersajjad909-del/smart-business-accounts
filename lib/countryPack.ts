// FILE: lib/countryPack.ts
//
// What a company's country switches on and off.
//
// The country comes from the company's own setting (Company.country), never
// from the visitor's IP: a UAE company can sign in from Pakistan, and a demo
// account can sit in either country. IP is only for the marketing site's
// pricing currency.
//
// Pure data and pure functions, safe to import from client components. Add a
// country by adding an entry here; nothing else needs to learn its name.

import { normalizeCountryCode } from "@/lib/countries";

export type CountryPack = {
  code: string;
  /** Primary tax registration number, as the country's own forms call it. */
  taxIdLabel: string;
  features: {
    /** Pakistan FBR digital invoicing gateway (lib/fbrEInvoice.ts). */
    fbrEInvoice: boolean;
  };
};

const GENERIC: CountryPack = { code: "", taxIdLabel: "Tax ID", features: { fbrEInvoice: false } };

const PACKS: Record<string, CountryPack> = {
  PK: { code: "PK", taxIdLabel: "NTN", features: { fbrEInvoice: true } },
  AE: { code: "AE", taxIdLabel: "TRN", features: { fbrEInvoice: false } },
};

// Names the shared country list does not know, which the tax engine accepts.
const ALIASES: Record<string, string> = { UAE: "AE", KSA: "SA", UK: "GB", USA: "US" };

export function countryCodeOf(country: string | null | undefined): string {
  const code = normalizeCountryCode(country);
  return ALIASES[code] ?? code;
}

export function getCountryPack(country: string | null | undefined): CountryPack {
  const code = countryCodeOf(country);
  return PACKS[code] ?? { ...GENERIC, code };
}

/**
 * Whether the FBR e-invoice screens and APIs are open to a company.
 *
 * Pakistan companies get them. A company that already connected the gateway
 * keeps them whatever its country says: Company.country defaults to "United
 * States", so a Pakistani business that never changed it must not lose a
 * feature it is already filing with.
 */
export function isFbrAvailable(country: string | null | undefined, fbrConnected: boolean): boolean {
  return fbrConnected || getCountryPack(country).features.fbrEInvoice;
}
