/**
 * What each document prints, and how it looks doing it.
 *
 * Print settings used to be thirteen flat fields on the company — one set,
 * applied to all seven documents at once. `invoiceTemplate` was named for the
 * invoice and silently decided the look of the purchase order, the challan, the
 * GRN, the quotation and the sale return too; switching "Show logo" off took the
 * logo off every one of them. There was nowhere to say "the PO does not carry
 * the supplier's NTN, but the invoice carries the customer's".
 *
 * So: a `base` profile every document starts from, and per document only the
 * fields that actually differ. Storing a whole profile per document would mean
 * seven edits to change a footer note, and seven copies that drift apart by the
 * third month — the delta is the thing worth keeping.
 *
 *   base: { design: "classic_ledger", fields: { partyTaxNumber: true, … } }
 *   perDoc.purchase_order: { fields: { partyTaxNumber: false } }
 *   → the PO prints everything the base says, minus the supplier's NTN.
 *
 * Migration is deliberately inert: the old flat settings become `base` and
 * `perDoc` starts empty, so on the first day after this ships every document
 * prints exactly what it printed the day before. A difference only appears once
 * somebody makes one.
 */

import type { PrintDesignId } from "@/components/print/printLayouts";

// ─────────────────────────────────────────────────────────────
//  The documents
// ─────────────────────────────────────────────────────────────

export type DocKind =
  | "sales_invoice"
  | "purchase_invoice"
  | "quotation"
  | "purchase_order"
  | "delivery_challan"
  | "grn"
  | "sale_return";

export const DOC_KINDS: { id: DocKind; label: string; route: string; partyWord: string }[] = [
  { id: "sales_invoice",    label: "Sales Invoice",    route: "/dashboard/sales-invoice",    partyWord: "Customer" },
  { id: "purchase_invoice", label: "Purchase Invoice", route: "/dashboard/purchase-invoice", partyWord: "Supplier" },
  { id: "quotation",        label: "Quotation",        route: "/dashboard/quotation",        partyWord: "Customer" },
  { id: "purchase_order",   label: "Purchase Order",   route: "/dashboard/purchase-order",   partyWord: "Supplier" },
  { id: "delivery_challan", label: "Delivery Challan", route: "/dashboard/delivery-challan", partyWord: "Customer" },
  { id: "grn",              label: "GRN",              route: "/dashboard/grn",              partyWord: "Supplier" },
  { id: "sale_return",      label: "Sale Return",      route: "/dashboard/sale-return",      partyWord: "Customer" },
];

export function docKindLabel(doc: DocKind): string {
  return DOC_KINDS.find((d) => d.id === doc)?.label ?? doc;
}

/** "Customer" or "Supplier" — so the settings screen never asks about the wrong side. */
export function docPartyWord(doc: DocKind): string {
  return DOC_KINDS.find((d) => d.id === doc)?.partyWord ?? "Party";
}

// ─────────────────────────────────────────────────────────────
//  What may appear on the sheet
//
//  Company and party are separate switches on purpose. One combined
//  "Show Tax / NTN label" used to gate the seller's numbers only, so a company
//  that turned it off still printed its customer's NTN on the customer's own
//  copy. Whose information it is, is the question being asked.
// ─────────────────────────────────────────────────────────────

export type PrintFieldKey =
  // ── Company side ──
  | "logo"
  | "companyAddress"
  | "companyPhone"
  | "companyEmail"
  | "companyTaxNumber"
  // ── Party side (customer or supplier, depending on the document) ──
  | "partyAddress"
  | "partyPhone"
  | "partyTaxNumber"
  // ── The body of the sheet ──
  | "amountInWords"
  | "summary"
  | "terms"
  | "signatures"
  | "footerNote";

export type PrintFields = Record<PrintFieldKey, boolean>;

export const PRINT_FIELD_GROUPS: {
  group: "company" | "party" | "body";
  title: string;
  items: { key: PrintFieldKey; label: string; hint?: string }[];
}[] = [
  {
    group: "company",
    title: "Your business",
    items: [
      { key: "logo",             label: "Logo" },
      { key: "companyAddress",   label: "Address" },
      { key: "companyPhone",     label: "Phone" },
      { key: "companyEmail",     label: "Email" },
      { key: "companyTaxNumber", label: "NTN / STRN", hint: "Your own tax registration" },
    ],
  },
  {
    group: "party",
    title: "The other side",
    items: [
      { key: "partyAddress",   label: "Address" },
      { key: "partyPhone",     label: "Phone" },
      { key: "partyTaxNumber", label: "NTN / STRN", hint: "Their tax registration" },
    ],
  },
  {
    group: "body",
    title: "On the sheet",
    items: [
      { key: "amountInWords", label: "Amount in words" },
      { key: "summary",       label: "Counted summary", hint: "Total pieces, total lines" },
      { key: "terms",         label: "Terms & conditions" },
      { key: "signatures",    label: "Signature lines" },
      { key: "footerNote",    label: "Footer note" },
    ],
  },
];

export const ALL_FIELD_KEYS: PrintFieldKey[] = PRINT_FIELD_GROUPS.flatMap((g) => g.items.map((i) => i.key));

// ─────────────────────────────────────────────────────────────
//  A profile
// ─────────────────────────────────────────────────────────────

export type PrintProfile = {
  design: PrintDesignId;
  fields: PrintFields;
  /** Printed under the signatures. Empty string prints nothing. */
  footerNote: string;
  /** Whatever this trade signs a document off with. */
  signatureLabels: string[];
};

export type PrintProfilePatch = {
  design?: PrintDesignId;
  fields?: Partial<PrintFields>;
  footerNote?: string;
  signatureLabels?: string[];
};

export type PrintProfiles = {
  base: PrintProfile;
  perDoc: Partial<Record<DocKind, PrintProfilePatch>>;
};

const ALL_ON: PrintFields = ALL_FIELD_KEYS.reduce((acc, k) => {
  acc[k] = true;
  return acc;
}, {} as PrintFields);

export const DEFAULT_PRINT_PROFILE: PrintProfile = {
  design: "classic_ledger",
  fields: { ...ALL_ON },
  footerNote: "Thank you for your business.",
  signatureLabels: ["Prepared By", "Checked By", "Received By"],
};

export const DEFAULT_PRINT_PROFILES: PrintProfiles = {
  base: DEFAULT_PRINT_PROFILE,
  perDoc: {},
};

// ─────────────────────────────────────────────────────────────
//  Resolution
// ─────────────────────────────────────────────────────────────

/**
 * base + this document's patch = what gets printed.
 *
 * Every document asks this one question and nothing else, which is what stops
 * the seven pages drifting into seven readings of the same settings — the state
 * they were in before, where two of them hand-rolled it and got a switch wrong.
 */
export function resolvePrintProfile(profiles: PrintProfiles | null | undefined, doc: DocKind): PrintProfile {
  const base = profiles?.base ?? DEFAULT_PRINT_PROFILE;
  const patch = profiles?.perDoc?.[doc];
  if (!patch) return base;
  return {
    design: patch.design ?? base.design,
    fields: { ...base.fields, ...(patch.fields || {}) },
    footerNote: patch.footerNote ?? base.footerNote,
    signatureLabels: patch.signatureLabels ?? base.signatureLabels,
  };
}

/** Which keys this document overrides — the count the settings list shows. */
export function overriddenKeys(profiles: PrintProfiles, doc: DocKind): string[] {
  const patch = profiles.perDoc?.[doc];
  if (!patch) return [];
  const out: string[] = [];
  if (patch.design !== undefined && patch.design !== profiles.base.design) out.push("design");
  if (patch.footerNote !== undefined && patch.footerNote !== profiles.base.footerNote) out.push("footerNote");
  if (patch.signatureLabels !== undefined) out.push("signatureLabels");
  for (const [k, v] of Object.entries(patch.fields || {})) {
    if (v !== undefined && v !== profiles.base.fields[k as PrintFieldKey]) out.push(k);
  }
  return out;
}

/**
 * Sets one value on one document, dropping the override again when it lands
 * back on what the base says.
 *
 * Keeping a patch that matches the base would make "Reset to base" a lie: the
 * document would still be marked as overridden, and a later change to the base
 * would silently not reach it.
 */
export function setDocField(
  profiles: PrintProfiles,
  doc: DocKind,
  key: PrintFieldKey,
  value: boolean,
): PrintProfiles {
  const patch: PrintProfilePatch = { ...(profiles.perDoc[doc] || {}) };
  const fields = { ...(patch.fields || {}) };
  if (value === profiles.base.fields[key]) delete fields[key];
  else fields[key] = value;
  patch.fields = fields;
  return prune(profiles, doc, patch);
}

export function setDocDesign(profiles: PrintProfiles, doc: DocKind, design: PrintDesignId): PrintProfiles {
  const patch: PrintProfilePatch = { ...(profiles.perDoc[doc] || {}) };
  if (design === profiles.base.design) delete patch.design;
  else patch.design = design;
  return prune(profiles, doc, patch);
}

export function setDocFooterNote(profiles: PrintProfiles, doc: DocKind, note: string): PrintProfiles {
  const patch: PrintProfilePatch = { ...(profiles.perDoc[doc] || {}) };
  if (note === profiles.base.footerNote) delete patch.footerNote;
  else patch.footerNote = note;
  return prune(profiles, doc, patch);
}

export function resetDoc(profiles: PrintProfiles, doc: DocKind): PrintProfiles {
  const perDoc = { ...profiles.perDoc };
  delete perDoc[doc];
  return { ...profiles, perDoc };
}

// ─────────────────────────────────────────────────────────────
//  Editing the base
//
//  Changing the base has to sweep the overrides afterwards. A document that
//  had "logo off" while the base said on is genuinely overriding it; the moment
//  the base is switched off too, that same entry is saying nothing — and if it
//  stayed, the document would be marked as customised forever and would stop
//  following the base the next time it moved.
// ─────────────────────────────────────────────────────────────

function sweep(profiles: PrintProfiles): PrintProfiles {
  const perDoc: Partial<Record<DocKind, PrintProfilePatch>> = {};
  for (const [doc, patch] of Object.entries(profiles.perDoc) as [DocKind, PrintProfilePatch][]) {
    if (!patch) continue;
    const next: PrintProfilePatch = {};
    if (patch.design !== undefined && patch.design !== profiles.base.design) next.design = patch.design;
    if (patch.footerNote !== undefined && patch.footerNote !== profiles.base.footerNote) next.footerNote = patch.footerNote;
    if (patch.signatureLabels !== undefined) next.signatureLabels = patch.signatureLabels;
    const fields: Partial<PrintFields> = {};
    for (const [k, v] of Object.entries(patch.fields || {})) {
      if (v !== undefined && v !== profiles.base.fields[k as PrintFieldKey]) fields[k as PrintFieldKey] = v as boolean;
    }
    if (Object.keys(fields).length) next.fields = fields;
    if (Object.keys(next).length) perDoc[doc] = next;
  }
  return { ...profiles, perDoc };
}

export function setBaseField(profiles: PrintProfiles, key: PrintFieldKey, value: boolean): PrintProfiles {
  return sweep({ ...profiles, base: { ...profiles.base, fields: { ...profiles.base.fields, [key]: value } } });
}

export function setBaseDesign(profiles: PrintProfiles, design: PrintDesignId): PrintProfiles {
  return sweep({ ...profiles, base: { ...profiles.base, design } });
}

export function setBaseFooterNote(profiles: PrintProfiles, note: string): PrintProfiles {
  return sweep({ ...profiles, base: { ...profiles.base, footerNote: note } });
}

function prune(profiles: PrintProfiles, doc: DocKind, patch: PrintProfilePatch): PrintProfiles {
  const empty =
    patch.design === undefined &&
    patch.footerNote === undefined &&
    patch.signatureLabels === undefined &&
    Object.keys(patch.fields || {}).length === 0;
  const perDoc = { ...profiles.perDoc };
  if (empty) delete perDoc[doc];
  else perDoc[doc] = patch;
  return { ...profiles, perDoc };
}

// ─────────────────────────────────────────────────────────────
//  Reading whatever is stored
// ─────────────────────────────────────────────────────────────

const VALID_KEYS = new Set<string>(ALL_FIELD_KEYS);

function cleanFields(raw: unknown, fallback: PrintFields): PrintFields {
  const out = { ...fallback };
  if (raw && typeof raw === "object") {
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      if (VALID_KEYS.has(k) && typeof v === "boolean") out[k as PrintFieldKey] = v;
    }
  }
  return out;
}

function cleanLabels(raw: unknown, fallback: string[]): string[] {
  if (!Array.isArray(raw)) return fallback;
  const labels = raw.map((v) => String(v ?? "").trim()).filter(Boolean).slice(0, 4);
  return labels.length ? labels : fallback;
}

/**
 * The stored profiles, or a set built from the old flat print preferences.
 *
 * `legacy` is the pre-existing `printPreferences` blob. Its four switches map
 * onto the new ones, and `showTaxNumber` is read onto *both* tax switches
 * because that is what it used to mean in the only place it worked — the
 * company letterhead — and what the customer expected it to mean everywhere.
 */
export function normalizePrintProfiles(
  raw: unknown,
  legacy?: { showLogo?: boolean; showAddress?: boolean; showPhone?: boolean; showTaxNumber?: boolean; footerNote?: string; invoiceTemplate?: string },
): PrintProfiles {
  const parsed = (raw && typeof raw === "object") ? raw as Partial<PrintProfiles> : null;

  const legacyBase: PrintProfile = {
    design: legacyDesign(legacy?.invoiceTemplate),
    fields: {
      ...ALL_ON,
      logo:             legacy?.showLogo !== false,
      companyAddress:   legacy?.showAddress !== false,
      companyPhone:     legacy?.showPhone !== false,
      companyTaxNumber: legacy?.showTaxNumber !== false,
      partyTaxNumber:   legacy?.showTaxNumber !== false,
    },
    footerNote: typeof legacy?.footerNote === "string" ? legacy.footerNote : DEFAULT_PRINT_PROFILE.footerNote,
    signatureLabels: DEFAULT_PRINT_PROFILE.signatureLabels,
  };

  if (!parsed?.base) return { base: legacyBase, perDoc: {} };

  const rawBase = parsed.base as Partial<PrintProfile>;
  const base: PrintProfile = {
    design: isDesignId(rawBase.design) ? rawBase.design : legacyBase.design,
    fields: cleanFields(rawBase.fields, legacyBase.fields),
    footerNote: typeof rawBase.footerNote === "string" ? rawBase.footerNote : legacyBase.footerNote,
    signatureLabels: cleanLabels(rawBase.signatureLabels, legacyBase.signatureLabels),
  };

  const perDoc: Partial<Record<DocKind, PrintProfilePatch>> = {};
  const rawPerDoc = (parsed.perDoc && typeof parsed.perDoc === "object") ? parsed.perDoc as Record<string, unknown> : {};
  for (const { id } of DOC_KINDS) {
    const entry = rawPerDoc[id];
    if (!entry || typeof entry !== "object") continue;
    const e = entry as Partial<PrintProfilePatch>;
    const patch: PrintProfilePatch = {};
    if (isDesignId(e.design)) patch.design = e.design;
    if (typeof e.footerNote === "string") patch.footerNote = e.footerNote;
    if (Array.isArray(e.signatureLabels)) patch.signatureLabels = cleanLabels(e.signatureLabels, base.signatureLabels);
    if (e.fields && typeof e.fields === "object") {
      const fields: Partial<PrintFields> = {};
      for (const [k, v] of Object.entries(e.fields as Record<string, unknown>)) {
        if (VALID_KEYS.has(k) && typeof v === "boolean") fields[k as PrintFieldKey] = v;
      }
      if (Object.keys(fields).length) patch.fields = fields;
    }
    if (Object.keys(patch).length) perDoc[id] = patch;
  }

  return { base, perDoc };
}

const DESIGN_IDS = new Set<string>([
  "classic_ledger", "formal_gst", "modern_band", "clean_minimal", "compact_dense", "bold_statement",
]);

function isDesignId(v: unknown): v is PrintDesignId {
  return typeof v === "string" && DESIGN_IDS.has(v);
}

/** The old four template names, mapped onto the nearest of the new designs. */
function legacyDesign(template?: string): PrintDesignId {
  switch (String(template || "").toLowerCase()) {
    case "minimal":
    case "compact": return "clean_minimal";
    case "bold":    return "bold_statement";
    case "modern":  return "modern_band";
    default:        return "classic_ledger";
  }
}
