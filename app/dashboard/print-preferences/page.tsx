"use client";

/**
 * Print Preferences — one document at a time.
 *
 * The order on this screen is the order the decision is actually made in:
 * pick the document, say what may appear on it, then choose how it looks, with
 * a preview that already reflects what was allowed. Choosing a design first
 * means judging it against a sheet that still shows fields you are about to
 * turn off, which is how the old four-name dropdown in Admin Control told
 * nobody anything.
 *
 * Everything writes to the per-document profile in lib/printProfile.ts — base
 * plus deltas — so a control that has not been touched here says "inherited"
 * and follows the base when the base changes.
 */

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useResponsive } from "@/hooks/useResponsive";
import { PrintDocA4, PrintPaperWrapper } from "@/components/print/PrintDocA4";
import { PRINT_DESIGNS } from "@/components/print/printLayouts";
import type { PrintDesignId } from "@/components/print/printLayouts";
import {
  DOC_KINDS,
  PRINT_FIELD_GROUPS,
  DEFAULT_PRINT_PROFILES,
  docKindLabel,
  docPartyWord,
  overriddenKeys,
  resolvePrintProfile,
  resetDoc,
  setDocDesign,
  setDocField,
  setDocFooterNote,
  type DocKind,
  type PrintFieldKey,
  type PrintProfiles,
} from "@/lib/printProfile";

const FONT = "'Outfit','Inter',sans-serif";
const PANEL = "var(--panel-bg)";
const BORDER = "var(--border)";
const TEXT = "var(--text-primary)";
const MUTED = "var(--text-muted)";
const ACCENT = "#6366f1";

/* ── Sample data ───────────────────────────────────────────────
   Real-shaped, and plainly a sample: a preview built on empty rows shows
   nothing about how a design handles a long description or a wide figure. */
const SAMPLE_ROWS = [
  { sr: 1, desc: "PVC NON-STICK SHEET 15-L", unit: "ROLL", qty: "90", rate: "30.00", amount: "2,700.00" },
  { sr: 2, desc: "HDPE LINER 40 MICRON", unit: "KG", qty: "250", rate: "412.50", amount: "103,125.00" },
  { sr: 3, desc: "PRINTED POLY BAG 12×18", unit: "PCS", qty: "5,000", rate: "6.80", amount: "34,000.00" },
  { sr: 4, desc: "STRETCH FILM 500mm", unit: "ROLL", qty: "18", rate: "2,150.00", amount: "38,700.00" },
];

const SAMPLE_COLUMNS = [
  { key: "sr", label: "#", width: 26, align: "center" as const },
  { key: "desc", label: "Description" },
  { key: "unit", label: "Unit", width: 46, align: "center" as const },
  { key: "qty", label: "Qty", width: 58, align: "right" as const },
  { key: "rate", label: "Rate", width: 68, align: "right" as const },
  { key: "amount", label: "Amount", width: 84, align: "right" as const },
];

const SAMPLE_TOTALS = [
  { label: "Subtotal", value: 178525 },
  { label: "Discount", value: 3525 },
  { label: "Sales Tax 18%", value: 31500 },
  { label: "Net Total", value: 206500, bold: true, borderTop: true },
];

type CompanyBits = {
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  taxLabel?: string;
  taxValue?: string;
  strn?: string;
  logoUrl?: string;
};

export default function PrintPreferencesPage() {
  const { isMobile } = useResponsive();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [doc, setDoc] = useState<DocKind>("sales_invoice");
  const [profiles, setProfiles] = useState<PrintProfiles>(DEFAULT_PRINT_PROFILES);
  const [company, setCompany] = useState<CompanyBits>({ name: "Your Company" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [companyRes, adminRes] = await Promise.all([
        fetch("/api/me/company").then(r => (r.ok ? r.json() : null)).catch(() => null),
        fetch("/api/company/admin-control").then(r => (r.ok ? r.json() : null)).catch(() => null),
      ]);
      if (cancelled) return;
      if (adminRes?.printProfiles) setProfiles(adminRes.printProfiles as PrintProfiles);
      const identity = adminRes?.companyIdentity || {};
      const contact = adminRes?.invoiceContact || {};
      const tax = adminRes?.taxProfile || {};
      const prefs = adminRes?.printPreferences || {};
      setCompany({
        name: String(companyRes?.name || "Your Company"),
        address: String(identity.legalAddress || "").trim() || undefined,
        phone: String(contact.phone || "").trim() || undefined,
        email: String(contact.email || "").trim() || undefined,
        taxLabel: String(tax.taxIdLabel || "NTN").trim() || "NTN",
        taxValue: String(tax.taxIdValue || "").trim() || "1234567-8",
        strn: String(tax.gstNumber || "").trim() || "12-35-9816-59",
        logoUrl: String(prefs.logoUrl || companyRes?.logoUrl || "").trim() || undefined,
      });
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const resolved = useMemo(() => resolvePrintProfile(profiles, doc), [profiles, doc]);
  const overrides = useMemo(() => overriddenKeys(profiles, doc), [profiles, doc]);
  const overrideSet = useMemo(() => new Set(overrides), [overrides]);

  const partyWord = docPartyWord(doc);

  function update(next: PrintProfiles) {
    setProfiles(next);
    setDirty(true);
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/company/admin-control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ printProfiles: profiles }),
      });
      if (!res.ok) throw new Error(await res.text());
      setDirty(false);
      toast.success("Saved. Every new print uses this.");
    } catch {
      toast.error("Save failed — nothing was written.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div style={{ padding: 32, fontFamily: FONT, color: MUTED }}>Loading print preferences…</div>;
  }

  return (
    <div style={{ fontFamily: FONT, color: TEXT, padding: isMobile ? "18px 14px 60px" : "24px 28px 60px", display: "flex", flexDirection: "column", gap: 18 }}>

      {/* ── Title ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 3px" }}>Print Preferences</h1>
          <p style={{ margin: 0, fontSize: 13, color: MUTED, maxWidth: "62ch" }}>
            Har document apni setting rakhta hai. Jo aap yahan nahi chhedte, wo{" "}
            <b>All documents</b> se chalta rahega.
          </p>
        </div>
        <button
          onClick={save}
          disabled={saving || !dirty}
          style={{
            padding: "10px 20px", borderRadius: 9,
            background: dirty ? ACCENT : "var(--panel-bg)",
            color: dirty ? "#fff" : MUTED,
            border: dirty ? "1px solid transparent" : `1px solid ${BORDER}`,
            fontFamily: FONT, fontSize: 14, fontWeight: 600,
            cursor: saving || !dirty ? "default" : "pointer",
          }}
        >
          {saving ? "Saving…" : dirty ? "Save changes" : "Saved"}
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "216px minmax(0,1fr)", gap: 16, alignItems: "start" }}>

        {/* ── 1. Which document ── */}
        <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: "11px 14px", borderBottom: `1px solid ${BORDER}`, fontSize: 11, letterSpacing: 0.7, textTransform: "uppercase", color: MUTED }}>
            Document
          </div>
          {DOC_KINDS.map(d => {
            const active = d.id === doc;
            const n = overriddenKeys(profiles, d.id).length;
            return (
              <div
                key={d.id}
                id={`pp-doc-${d.id}`}
                role="button"
                tabIndex={0}
                onClick={() => setDoc(d.id)}
                onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setDoc(d.id); } }}
                style={{
                  padding: "11px 14px", cursor: "pointer",
                  borderBottom: `1px solid ${BORDER}`,
                  borderLeft: `3px solid ${active ? ACCENT : "transparent"}`,
                  background: active ? "rgba(99,102,241,0.10)" : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
                }}
              >
                <span style={{ fontSize: 13.5, fontWeight: active ? 700 : 500 }}>{d.label}</span>
                {n > 0 && (
                  <span
                    title={`${n} setting${n > 1 ? "s" : ""} is document ke liye alag hai`}
                    style={{ fontSize: 10.5, fontWeight: 700, color: "#b45309", background: "rgba(245,158,11,0.16)", padding: "1px 6px", borderRadius: 5 }}
                  >
                    {n}
                  </span>
                )}
              </div>
            );
          })}
          <div style={{ padding: "11px 14px", fontSize: 11.5, color: MUTED, lineHeight: 1.5 }}>
            Number batata hai ke us document ki kitni settings base se alag hain.
          </div>
        </div>

        {/* ── Right column ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>

          {/* ── 2. What may appear ── */}
          <section style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "16px 18px", display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <h2 style={{ fontSize: 15.5, fontWeight: 700, margin: "0 0 3px" }}>
                {docKindLabel(doc)} — kya kya chhape
              </h2>
              <p style={{ margin: 0, fontSize: 12.5, color: MUTED }}>
                Dono taraf ki information alag alag: aap ki apni, aur {partyWord.toLowerCase()} ki.
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0,1fr))", gap: 14 }}>
              {PRINT_FIELD_GROUPS.map(group => (
                <div key={group.group} style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  <div style={{ fontSize: 11, letterSpacing: 0.6, textTransform: "uppercase", color: MUTED, paddingBottom: 4, borderBottom: `1px solid ${BORDER}` }}>
                    {group.group === "party" ? partyWord : group.title}
                  </div>
                  {group.items.map(item => {
                    const checked = resolved.fields[item.key];
                    const isOverride = overrideSet.has(item.key);
                    return (
                      <label
                        key={item.key}
                        htmlFor={`pp-${doc}-${item.key}`}
                        style={{ display: "flex", alignItems: "flex-start", gap: 8, cursor: "pointer", fontSize: 13 }}
                      >
                        <input
                          id={`pp-${doc}-${item.key}`}
                          type="checkbox"
                          checked={checked}
                          onChange={e => update(setDocField(profiles, doc, item.key as PrintFieldKey, e.target.checked))}
                          style={{ marginTop: 2, accentColor: ACCENT, width: 15, height: 15, flex: "none" }}
                        />
                        <span style={{ minWidth: 0 }}>
                          <span style={{ color: checked ? TEXT : MUTED }}>{item.label}</span>
                          {isOverride && (
                            <span style={{ fontSize: 10, color: "#b45309", marginLeft: 6, whiteSpace: "nowrap" }}>alag</span>
                          )}
                          {item.hint && (
                            <span style={{ display: "block", fontSize: 11, color: MUTED, lineHeight: 1.4 }}>{item.hint}</span>
                          )}
                        </span>
                      </label>
                    );
                  })}
                </div>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr auto", gap: 12, alignItems: "end" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <label htmlFor={`pp-${doc}-footer`} style={{ fontSize: 11, letterSpacing: 0.6, textTransform: "uppercase", color: MUTED }}>
                  Footer note
                </label>
                <input
                  id={`pp-${doc}-footer`}
                  value={resolved.footerNote}
                  onChange={e => update(setDocFooterNote(profiles, doc, e.target.value))}
                  placeholder="Thank you for your business."
                  style={{
                    padding: "9px 12px", borderRadius: 8, border: `1.5px solid ${BORDER}`,
                    background: "var(--app-bg)", color: TEXT, fontFamily: FONT, fontSize: 13, outline: "none",
                  }}
                />
              </div>
              <button
                onClick={() => update(resetDoc(profiles, doc))}
                disabled={overrides.length === 0}
                style={{
                  padding: "9px 14px", borderRadius: 8, border: `1px solid ${BORDER}`,
                  background: "transparent",
                  color: overrides.length === 0 ? MUTED : TEXT,
                  fontFamily: FONT, fontSize: 12.5,
                  cursor: overrides.length === 0 ? "default" : "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                Reset to base
              </button>
            </div>
          </section>

          {/* ── 3. Design ── */}
          <section style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "16px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <h2 style={{ fontSize: 15.5, fontWeight: 700, margin: "0 0 3px" }}>Design</h2>
              <p style={{ margin: 0, fontSize: 12.5, color: MUTED }}>
                Har design ka apna layout hai — letterhead, party block, grid aur totals sab badalte hain.
                Column order aur width har design me aik jaisi rehti hai.
              </p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(190px, 1fr))", gap: 10 }}>
              {PRINT_DESIGNS.map(d => {
                const active = d.id === resolved.design;
                return (
                  <div
                    key={d.id}
                    id={`pp-design-${d.id}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => update(setDocDesign(profiles, doc, d.id as PrintDesignId))}
                    onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); update(setDocDesign(profiles, doc, d.id as PrintDesignId)); } }}
                    style={{
                      border: `1.5px solid ${active ? ACCENT : BORDER}`,
                      background: active ? "rgba(99,102,241,0.08)" : "transparent",
                      borderRadius: 10, padding: 10, cursor: "pointer",
                      display: "flex", flexDirection: "column", gap: 8,
                    }}
                  >
                    <DesignThumb design={d.id} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>{d.label}</div>
                      <div style={{ fontSize: 11.5, color: MUTED, lineHeight: 1.4, marginTop: 2 }}>{d.blurb}</div>
                      <div style={{ fontSize: 10.5, color: MUTED, marginTop: 4, fontVariantNumeric: "tabular-nums" }}>
                        ~{d.linesPerPage} lines / A4 sheet
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ── 4. Preview ── */}
          <section style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <h2 style={{ fontSize: 15.5, fontWeight: 700, margin: 0 }}>Preview</h2>
              <span style={{ fontSize: 11.5, color: MUTED }}>
                Sample data · A4 210×297mm · bilkul wahi jo {docKindLabel(doc)} par chhapega
              </span>
            </div>
            <div style={{ border: `1px solid ${BORDER}`, borderRadius: 12, overflow: "hidden" }}>
              <div style={{ overflow: "auto", maxHeight: 760 }}>
                <PrintPaperWrapper>
                  <PrintDocA4
                    design={resolved.design}
                    fields={resolved.fields}
                    companyName={company.name}
                    companyAddress={company.address || "p-277, Lasani Town, Faisalabad"}
                    companyPhone={company.phone || "+92-317-8653693"}
                    companyEmail={company.email}
                    companyTaxLabel={company.taxLabel}
                    companyTaxValue={company.taxValue}
                    companyStrn={company.strn}
                    logoUrl={company.logoUrl}
                    showLogo
                    docTitle={docKindLabel(doc).toUpperCase()}
                    docNo="SI-1042"
                    date="12-09-2026"
                    dueDate="27-09-2026"
                    partyLabel={partyWord === "Supplier" ? "Supplier" : "Bill To"}
                    partyName="SAJJAD ENTERPRISES"
                    partyAddress="Lasani Town, Faisalabad"
                    partyPhone="0304-7653693"
                    partyNtn="4545201-8"
                    partyStrn="12-35-9816-59"
                    metaFields={[{ label: "Order No", value: "PO-2026-114" }]}
                    columns={SAMPLE_COLUMNS}
                    rows={SAMPLE_ROWS}
                    totalsLines={SAMPLE_TOTALS}
                    summaryFields={[{ label: "Total Lines", value: "4" }, { label: "Total Qty", value: "5,358" }]}
                    amountInWords="Two hundred six thousand five hundred Only."
                    notes="Goods dispatched against your order."
                    terms="Payment within 15 days. Goods once sold are not returnable."
                    footerNote={resolved.footerNote}
                    signatureLabels={resolved.signatureLabels}
                  />
                </PrintPaperWrapper>
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}

/* ── Design thumbnail ──────────────────────────────────────────
   A drawing, not a screenshot: the whole point of the picker is telling six
   structures apart at a glance, and six 210mm sheets scaled down to 180px are
   six grey rectangles. These show the arrangement — where the letterhead sits,
   whether the party is boxed, how the rows are ruled, where the net lands. */
function DesignThumb({ design }: { design: string }) {
  const d = PRINT_DESIGNS.find(x => x.id === design) || PRINT_DESIGNS[0];
  const line = "var(--text-muted)";
  const solid = "var(--text-primary)";

  const bar = (w: string, h = 3, color = line, extra: React.CSSProperties = {}) => (
    <div style={{ width: w, height: h, background: color, borderRadius: 1, opacity: color === line ? 0.55 : 1, ...extra }} />
  );

  return (
    <div
      aria-hidden="true"
      style={{
        background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 6,
        aspectRatio: "210 / 148", padding: 7,
        display: "flex", flexDirection: "column", gap: 4, overflow: "hidden",
      }}
    >
      {/* letterhead */}
      {d.header === "band" && (
        <div style={{ margin: -7, marginBottom: 2, padding: "6px 7px", background: "#334155", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>{bar("30px", 4, "#fff")}{bar("22px", 2, "#cbd5e1")}</div>
          {bar("18px", 4, "#fff")}
        </div>
      )}
      {d.header === "split" && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>{bar("30px", 4, solid)}{bar("24px")}</div>
          {bar("18px", 4, solid)}
        </div>
      )}
      {d.header === "centered" && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
          {bar("34px", 4, solid)}{bar("26px")}
          <div style={{ borderTop: `1px solid ${solid}`, borderBottom: `1px solid ${solid}`, padding: "2px 0", marginTop: 2 }}>{bar("22px", 3, solid)}</div>
        </div>
      )}
      {d.header === "stacked" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>{bar("28px", 4, solid)}{bar("22px")}</div>
          <div style={{ borderTop: `2px solid ${solid}`, paddingTop: 3 }}>{bar("44px", 6, solid)}</div>
        </div>
      )}

      {/* party */}
      {d.party === "cards" && (
        <div style={{ display: "flex", gap: 4 }}>
          <div style={{ flex: 1, border: `1px solid ${line}`, borderRadius: 2, padding: 3, display: "flex", flexDirection: "column", gap: 2 }}>{bar("70%")}{bar("50%", 2)}</div>
          <div style={{ flex: 1, border: `1px solid ${line}`, borderRadius: 2, padding: 3, display: "flex", flexDirection: "column", gap: 2 }}>{bar("60%")}{bar("45%", 2)}</div>
        </div>
      )}
      {d.party === "inline" && (
        <div style={{ border: `1px solid ${line}`, borderRadius: 2, padding: 3, display: "flex", flexDirection: "column", gap: 2 }}>{bar("80%")}{bar("55%", 2)}</div>
      )}
      {d.party === "letter" && (
        <div style={{ display: "flex", justifyContent: "space-between", gap: 6 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>{bar("36px")}{bar("28px", 2)}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2, alignItems: "flex-end" }}>{bar("20px", 2)}{bar("16px", 2)}</div>
        </div>
      )}

      {/* grid */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 0, minHeight: 0 }}>
        <div style={{ height: 5, background: d.grid === "open" ? "transparent" : "#e2e8f0", borderBottom: `1px solid ${line}` }} />
        {[0, 1, 2, 3].map(i => (
          <div
            key={i}
            style={{
              height: d.density === "tight" ? 4 : 5,
              background: d.grid === "zebra" && i % 2 === 1 ? "#f1f5f9" : "transparent",
              borderBottom: d.grid === "ruled" || d.grid === "rows" ? `1px solid ${line}` : "none",
              display: "flex", alignItems: "center", gap: 3, paddingInline: 2,
              ...(d.grid === "ruled" ? { borderRight: `1px solid ${line}`, borderLeft: `1px solid ${line}` } : {}),
            }}
          >
            {bar("40%", 1.5)}{bar("14%", 1.5)}{bar("18%", 1.5)}
          </div>
        ))}
      </div>

      {/* totals */}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        {d.totals === "bar" && <div style={{ width: "42%", height: 6, background: "#334155", borderRadius: 1 }} />}
        {d.totals === "boxed" && (
          <div style={{ width: "42%", border: `1px solid ${line}`, borderRadius: 2, padding: 2, display: "flex", flexDirection: "column", gap: 1.5 }}>
            {bar("100%", 1.5)}{bar("100%", 1.5)}{bar("60%", 3, solid)}
          </div>
        )}
        {d.totals === "right" && (
          <div style={{ width: "42%", display: "flex", flexDirection: "column", gap: 1.5, alignItems: "flex-end" }}>
            {bar("100%", 1.5)}{bar("100%", 1.5)}
            <div style={{ width: "100%", borderTop: `1px solid ${solid}`, paddingTop: 2 }}>{bar("60%", 3, solid, { marginLeft: "auto" })}</div>
          </div>
        )}
      </div>

      {/* signatures */}
      <div style={{ display: "flex", justifyContent: d.signatures === "three" ? "space-between" : "flex-end", gap: 5 }}>
        {Array.from({ length: d.signatures === "three" ? 3 : d.signatures === "two_right" ? 2 : 1 }).map((_, i) => (
          <div key={i} style={{ width: d.signatures === "three" ? "30%" : "26%", borderTop: `1px solid ${solid}`, height: 0 }} />
        ))}
      </div>
    </div>
  );
}
