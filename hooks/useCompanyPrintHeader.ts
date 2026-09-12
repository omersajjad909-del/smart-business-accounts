"use client";

/**
 * Everything a document needs to print itself: the company letterhead, the
 * design it is set to, and what it is allowed to show.
 *
 * Each document used to assemble this for itself, and only the two invoices
 * ever got it right. Turning "Show address" off in Admin Control left the
 * address printing on the challan, the quotation, the GRN, the purchase order
 * and the sale return; the NTN and STRN never reached most of them at all. A
 * setting that looks applied and is not is worse than one that does not exist.
 *
 * So the reading lives in one place:
 *
 *   const print = useCompanyPrintHeader("purchase_order");
 *   <PrintDocA4 {...print} docTitle="PURCHASE ORDER" … />
 *
 * Two things changed when print settings became per-document. The hook now
 * takes the document it is being read for, so the answer can differ between a
 * PO and an invoice. And it no longer blanks hidden values on the way out —
 * it hands `fields` to PrintDocA4 and lets the component decide, because
 * blanking at the call site is exactly what let a page forget one field and
 * print it anyway.
 *
 * Called without a document it returns the base profile, which is what the
 * company's default is — so an unmigrated caller still gets a correct sheet.
 */

import { useEffect, useState } from "react";
import {
  DEFAULT_PRINT_PROFILES,
  resolvePrintProfile,
  type DocKind,
  type PrintFieldKey,
  type PrintProfiles,
} from "@/lib/printProfile";
import type { PrintDesignId } from "@/components/print/printLayouts";

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
  /** The design this document prints in — pass straight to PrintDocA4. */
  design?: PrintDesignId;
  /** What this document may show. PrintDocA4 does the hiding. */
  fields?: Partial<Record<PrintFieldKey, boolean>>;
  /** The note under the signatures, per document. */
  footerNote?: string;
};
/**
 * `signatureLabels` is deliberately not returned. A challan is signed
 * "Received By / Delivered By" and a purchase order "Prepared By / Authorized
 * By" — each page already knows its own, and that is better domain knowledge
 * than one list on the company. How *many* lines print, and whether they print
 * at all, is what the profile decides: the design's `signatures` style and the
 * `signatures` field switch.
 */

const EMPTY: CompanyPrintHeader = { companyName: "" };

export function useCompanyPrintHeader(doc?: DocKind): CompanyPrintHeader {
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
      const profiles = (admin?.printProfiles as PrintProfiles) || DEFAULT_PRINT_PROFILES;
      // Without a document the per-document deltas do not apply — the base is
      // the company's default, and the honest answer for a caller that has not
      // said which document it is printing.
      const resolved = doc ? resolvePrintProfile(profiles, doc) : profiles.base;

      const text = (v: unknown) => {
        const s = String(v || "").trim();
        return s || undefined;
      };

      setHeader({
        companyName: String(company?.name || ""),
        companyAddress: text(identity.legalAddress),
        companyPhone: text(contact.phone),
        companyEmail: text(contact.email),
        companyTaxLabel: text(tax.taxIdLabel),
        companyTaxValue: text(tax.taxIdValue),
        // The Sales Tax Registration number is kept in the settings field named
        // `gstNumber` — one box serving GST, VAT and STRN depending on the
        // country.
        companyStrn: text(tax.gstNumber),
        showLogo: true,
        logoUrl: text(prefs.logoUrl) || text(company?.logoUrl),
        design: resolved.design,
        fields: resolved.fields,
        footerNote: resolved.footerNote,
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [doc]);

  return header;
}
