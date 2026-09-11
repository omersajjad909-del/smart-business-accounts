"use client";

/**
 * The company header every printed document shares — name, address, phone,
 * email and tax registration — with the Print & Branding switches applied.
 *
 * Each document used to assemble this for itself, and only the two invoices
 * ever got it right. Turning "Show address" off in Admin Control left the
 * address printing on the challan, the quotation, the GRN, the purchase order
 * and the sale return; the NTN and STRN never reached most of them at all. A
 * setting that looks applied and is not is worse than one that does not exist.
 *
 * So the reading lives in one place. A document spreads what comes back into
 * PrintDocA4 and cannot get it wrong — including documents added later, which
 * is the half that otherwise gets missed.
 *
 *   const header = useCompanyPrintHeader();
 *   <PrintDocA4 {...header} docTitle="QUOTATION" … />
 *
 * A document that already keeps its own print preferences for paper size or
 * footer notes is untouched by this — it only supplies the header.
 */

import { useEffect, useState } from "react";

export type CompanyPrintHeader = {
  companyName: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
  companyTaxLabel?: string;
  companyTaxValue?: string;
  companyStrn?: string;
  showLogo?: boolean;
  logoUrl?: string;
};

const EMPTY: CompanyPrintHeader = { companyName: "" };

export function useCompanyPrintHeader(): CompanyPrintHeader {
  const [header, setHeader] = useState<CompanyPrintHeader>(EMPTY);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const [company, admin] = await Promise.all([
        fetch("/api/me/company").then(r => (r.ok ? r.json() : null)).catch(() => null),
        fetch("/api/company/admin-control").then(r => (r.ok ? r.json() : null)).catch(() => null),
      ]);
      if (cancelled) return;

      const prefs = admin?.printPreferences || {};
      const identity = admin?.companyIdentity || {};
      const contact = admin?.invoiceContact || {};
      const tax = admin?.taxProfile || {};

      // `=== false` rather than a falsy check on purpose: these arrive missing
      // on a company that has never opened the settings, and missing has to
      // mean "show it", the way it always did.
      const hidden = (flag: unknown) => flag === false;
      const show = (flag: unknown, value: unknown) => {
        const text = String(value || "").trim();
        return hidden(flag) || !text ? undefined : text;
      };

      setHeader({
        companyName: String(company?.name || ""),
        companyAddress: show(prefs.showAddress, identity.legalAddress),
        companyPhone: show(prefs.showPhone, contact.phone),
        companyEmail: String(contact.email || "").trim() || undefined,
        companyTaxLabel: String(tax.taxIdLabel || "").trim() || undefined,
        companyTaxValue: show(prefs.showTaxNumber, tax.taxIdValue),
        // The Sales Tax Registration number is kept in the settings field named
        // `gstNumber` — one box serving GST, VAT and STRN depending on the
        // country. Hidden by the same switch as the NTN beside it.
        companyStrn: show(prefs.showTaxNumber, tax.gstNumber),
        showLogo: prefs.showLogo !== false,
        logoUrl: String(prefs.logoUrl || company?.logoUrl || "").trim() || undefined,
      });
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return header;
}
