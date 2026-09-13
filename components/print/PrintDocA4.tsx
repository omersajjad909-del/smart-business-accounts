"use client";
import React from "react";
import { printTheme, type PrintTemplateId, type PrintTheme } from "./printTemplates";
import { printDesign, type PrintDesign, type PrintDesignId } from "./printLayouts";
import type { PrintFieldKey } from "@/lib/printProfile";

/**
 * The printed document, as this trade has always printed one.
 *
 * What this replaced was a screen design put on paper: a filled header band, a
 * banner title, striped rows, generous padding. Beside the bill the old Oracle
 * system printed — a ruled grid, every figure boxed in its own column, the
 * whole order legible at a glance — it read as clutter, and on a page where
 * the dimensions each need a column of their own it ran out of width before it
 * ran out of columns.
 *
 * So: one structure, spent on the figures — letterhead, particulars, the ruled
 * grid, what was counted, what it comes to, and three signatures at the foot
 * of the sheet. The company's chosen template (see ./printTemplates.ts) only
 * changes the ink: rules, fills, spacing. Nothing is dropped between them, so
 * an operator never has to re-learn where a column went.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type PrintColumn = {
  key: string;
  label: string;
  align?: "left" | "right" | "center";
  width?: string | number;
  render?: (val: any, row: any, idx: number) => React.ReactNode;
  /**
   * Groups this column under a spanning header cell (e.g. "Primary" over
   * Unit/Qty/Rate, "Secondary" over its own Unit/Qty/Rate) — the dual-UOM
   * layout a poly-bag/textile sales tax invoice bills in. Columns without a
   * group render exactly as before, so this is opt-in per document.
   */
  group?: string;
};

export type PrintTotalsLine = { label: string; value: number; bold?: boolean; borderTop?: boolean };

export interface PrintDocA4Props {
  // Company
  companyName: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
  /** The seller's own NTN/STRN/Tax ID — label and value, shown only when both are set. */
  companyTaxLabel?: string;
  companyTaxValue?: string;
  /** Seller's Sales Tax Registration Number — a separate line from the NTN above. */
  companyStrn?: string;
  logoUrl?: string;
  showLogo?: boolean;

  // Document header
  docTitle: string;
  docNo: string;
  date: string;
  dueDate?: string;
  status?: string;

  // Party (Bill To / Supplier / Vendor / Customer)
  partyLabel?: string;
  partyName: string;
  partyAddress?: string;
  partyPhone?: string;
  partyNtn?: string;
  partyStrn?: string;

  // Right-side meta fields (Invoice Date, PO Ref, etc.)
  metaFields?: { label: string; value: string }[];

  // Items
  columns: PrintColumn[];
  rows: Record<string, any>[];

  // Totals rows (flexible)
  totalsLines: PrintTotalsLine[];

  /**
   * Counted, not costed: how many rolls, how many lines. It sits beside the
   * money at the foot of the sheet because that is the pair a storekeeper
   * checks a delivery against — the amount is for the office, the quantity is
   * for the gate.
   */
  summaryFields?: { label: string; value: string }[];

  /** The net total spelled out — "One million five hundred ... Only." */
  amountInWords?: string;

  // Footer
  notes?: string;
  terms?: string;
  footerNote?: string;

  // Signature lines (optional)
  signatureLabels?: string[];

  /** The company's chosen look. See ./printTemplates.ts. */
  template?: PrintTemplateId | string;

  /**
   * The design this document is set to print in — structure and ink together.
   * See ./printLayouts.ts. When given it replaces `template` entirely; without
   * it the older four-template behaviour is kept exactly as it was, so a page
   * that has not been moved over yet prints the same sheet it always did.
   */
  design?: PrintDesignId | string;

  /**
   * What this document is allowed to print, from Print Preferences.
   *
   * Gating lives here rather than at each call site because the call sites got
   * it wrong: every page passed `undefined` for a hidden field by hand, so a
   * page that forgot one printed it anyway — which is how a company that had
   * switched its tax numbers off still printed the buyer's NTN. A key left out
   * of this object means "show it", so a document that passes nothing behaves
   * the way it did before.
   */
  fields?: Partial<Record<PrintFieldKey, boolean>>;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** One particular in the header box: "Bill # :  6", ruled the way a form is. */
function HeadField({ label, value, flex, theme }: { label: string; value: React.ReactNode; flex?: number | string; theme: PrintTheme }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 6, flex: flex ?? "0 0 auto", minWidth: 0 }}>
      <span className="pdoc-label" style={{ fontSize: 9, letterSpacing: 0.3, whiteSpace: "nowrap" }}>{label} :</span>
      <span style={{ fontSize: 10.5, fontWeight: 700, borderBottom: `1px solid ${theme.rule}`, flex: 1, minWidth: 40, paddingBottom: 1 }}>
        {value || " "}
      </span>
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export function PrintDocA4({
  companyName,
  companyAddress,
  companyPhone,
  companyEmail,
  companyTaxLabel,
  companyTaxValue,
  companyStrn,
  logoUrl,
  showLogo,
  docTitle,
  docNo,
  date,
  dueDate,
  status,
  partyLabel = "Bill To",
  partyName,
  partyAddress,
  partyPhone,
  partyNtn,
  partyStrn,
  metaFields = [],
  columns,
  rows,
  totalsLines,
  summaryFields = [],
  amountInWords,
  notes,
  terms,
  footerNote,
  signatureLabels,
  template,
  design,
  fields,
}: PrintDocA4Props) {
  // A design carries its own palette, so it decides the ink too. Without one we
  // are on the old path: the template names the ink and the structure is the
  // single classic layout, which is what every unmigrated page still expects.
  const layout: PrintDesign | null = design ? printDesign(design) : null;
  const theme = printTheme(layout ? layout.ink : template);
  const RULE = `1px solid ${theme.rule}`;

  const headerStyle = layout?.header ?? (theme.band === "solid" ? "band" : "split");
  const partyStyle = layout?.party ?? "inline";
  const gridStyle = layout?.grid ?? (theme.zebra ? "zebra" : "ruled");
  const totalsStyle = layout?.totals ?? (theme.netFill ? "bar" : "right");
  const signatureStyle = layout?.signatures ?? "three";
  const footerStyle = layout?.footer ?? "centered";
  const banded = headerStyle === "band";
  const cellPad = layout?.density === "tight" ? "1.5px 4px" : theme.cellPad;

  /** Missing means show it — see the `fields` prop. */
  const on = (key: PrintFieldKey) => fields?.[key] !== false;

  // Last line of defence against a value that reached here still encrypted.
  //
  // Phone, NTN, STRN and IBAN are stored ciphered and decrypted by whichever
  // API hands the party over — and one of those paths missing the call is not
  // hypothetical: the sales invoice list shipped without it, so saved invoices
  // printed "enc:v1:…" where the buyer's tax numbers belong. On a document that
  // goes to the customer, printing nothing is strictly better than printing
  // ciphertext, and it makes the missing decrypt obvious on screen instead of
  // looking like a corrupt record. Prefix per lib/fieldEncrypt.ts, which cannot
  // be imported here — it pulls in node:crypto.
  const plain = (v?: string) => (v && !String(v).startsWith("enc:v1:") ? v : "");

  const pAddress = on("partyAddress") ? plain(partyAddress) : "";
  const pPhone = on("partyPhone") ? plain(partyPhone) : "";
  const pNtn = on("partyTaxNumber") ? plain(partyNtn) : "";
  const pStrn = on("partyTaxNumber") ? plain(partyStrn) : "";

  const partyLine = [
    pAddress,
    pPhone ? `Tel: ${pPhone}` : "",
    pNtn ? `NTN: ${pNtn}` : "",
    pStrn ? `STRN: ${pStrn}` : "",
  ].filter(Boolean).join("   ");

  const cAddress = on("companyAddress") ? companyAddress : undefined;
  const cPhone = on("companyPhone") ? companyPhone : undefined;
  const cEmail = on("companyEmail") ? companyEmail : undefined;
  const cTax = on("companyTaxNumber") ? companyTaxValue : undefined;
  const cStrn = on("companyTaxNumber") ? companyStrn : undefined;
  const wantLogo = showLogo && on("logo") && Boolean(logoUrl);

  /** The letterhead's text block — same content wherever the design puts it. */
  const companyBlock = (opts: { align?: "left" | "center"; reversed?: boolean }) => {
    const reversed = Boolean(opts.reversed);
    return (
      <div style={{ textAlign: opts.align || "left" }}>
        <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: 0.4, lineHeight: 1.1 }}>{companyName}</div>
        {(cAddress || cPhone || cEmail) && (
          <div className={reversed ? undefined : "pdoc-label"} style={{ fontSize: 8.5, marginTop: 2, lineHeight: 1.45, opacity: reversed ? 0.85 : 1 }}>
            {cAddress}
            {cPhone ? `${cAddress ? "  ·  " : ""}Tel: ${cPhone}` : ""}
            {cEmail ? `  ·  ${cEmail}` : ""}
          </div>
        )}
        {(cTax || cStrn) && (
          <div className={reversed ? undefined : "pdoc-label"} style={{ fontSize: 8.5, marginTop: 1, lineHeight: 1.45, opacity: reversed ? 0.85 : 1, fontWeight: 700 }}>
            {cTax ? `${companyTaxLabel || "NTN"}: ${cTax}` : ""}
            {cStrn ? `${cTax ? "   " : ""}STRN: ${cStrn}` : ""}
          </div>
        )}
      </div>
    );
  };

  const logoImg = wantLogo
    ? <img src={logoUrl} alt="" style={{ maxHeight: 38, maxWidth: 120, objectFit: "contain", display: "block" }} />
    : null;

  // Consecutive columns sharing a group become one spanning header cell
  // ("Primary" over Unit/Qty/Rate); a column with no group gets its own
  // cell spanning both header rows instead. No document passes `group`
  // today except the dual-UOM sales tax invoice, so this is a no-op — a
  // single header row exactly as before — everywhere else.
  const hasColumnGroups = columns.some((c) => c.group);
  const columnSegments = (() => {
    const segs: { group: string | null; cols: PrintColumn[] }[] = [];
    for (const c of columns) {
      const last = segs[segs.length - 1];
      if (c.group && last?.group === c.group) last.cols.push(c);
      else segs.push({ group: c.group || null, cols: [c] });
    }
    return segs;
  })();

  // Handed to the stylesheet below, so the rules that have to out-shout the
  // dashboard's own theme do not each need a copy of the palette.
  const vars = {
    "--pdoc-ink": theme.ink,
    "--pdoc-muted": theme.muted,
    "--pdoc-rule": theme.rule,
    "--pdoc-head-bg": theme.headBg,
    "--pdoc-head-ink": theme.headInk,
    "--pdoc-zebra": theme.zebra || "transparent",
  } as React.CSSProperties;

  return (
    <div
      className={`print-doc-a4 pdoc-t-${theme.id}`}
      style={{
        ...vars,
        width: "210mm", minHeight: "297mm", boxSizing: "border-box", margin: "0 auto",
        background: "#fff", color: theme.ink,
        padding: banded ? "0 0 8mm" : "10mm 10mm 8mm",
        display: "flex", flexDirection: "column",
      }}
    >

      {/* ── Letterhead: who is billing, and what this is ───────────
          Four arrangements of the same three things — mark, name, document
          title. This is the half of a printed document a reader recognises
          before they read a word of it, which is why the designs differ here
          most and inside the grid least. */}

      {headerStyle === "split" && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
          <div style={{ minWidth: 0, display: "flex", alignItems: "center", gap: 10 }}>
            {logoImg}
            {companyBlock({})}
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1.6, textTransform: "uppercase" }}>{docTitle}</div>
            <div className="pdoc-label" style={{ fontSize: 8.5, marginTop: 3 }}>{date}</div>
          </div>
        </div>
      )}

      {headerStyle === "band" && (
        <div
          className="pdoc-band"
          style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            background: theme.bandBg, color: theme.bandInk, padding: "7mm 10mm",
          }}
        >
          <div style={{ minWidth: 0, display: "flex", alignItems: "center", gap: 10 }}>
            {logoImg}
            {companyBlock({ reversed: true })}
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: 1.6, textTransform: "uppercase" }}>{docTitle}</div>
            <div style={{ fontSize: 8.5, marginTop: 3, opacity: 0.85 }}>{date}</div>
          </div>
        </div>
      )}

      {headerStyle === "centered" && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, paddingBottom: 8 }}>
            {logoImg}
            {companyBlock({ align: "center" })}
          </div>
          <div style={{ textAlign: "center" }}>
            <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 2.2, textTransform: "uppercase", borderTop: RULE, borderBottom: RULE, padding: "3px 18px", display: "inline-block" }}>
              {docTitle}
            </span>
          </div>
        </div>
      )}

      {headerStyle === "stacked" && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            {logoImg}
            {companyBlock({})}
          </div>
          <div style={{ borderTop: `2px solid ${theme.ink}`, paddingTop: 6, display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 16 }}>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: 1.2, textTransform: "uppercase", lineHeight: 1 }}>{docTitle}</div>
            <div className="pdoc-label" style={{ fontSize: 9 }}>{date}</div>
          </div>
        </div>
      )}

      {/* Everything below the band keeps the page's own margins. */}
      <div style={{ padding: banded ? "8mm 10mm 0" : 0, display: "flex", flexDirection: "column", flex: 1 }}>

        {/* The old templates could centre the title without changing anything
            else. A design that wants that uses the "centered" letterhead, so
            this only still fires on the legacy template path. */}
        {!layout && theme.titleAlign === "center" && !banded && (
          <div style={{ textAlign: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2.2, textTransform: "uppercase", borderTop: RULE, borderBottom: RULE, padding: "3px 14px", display: "inline-block" }}>
              {docTitle}
            </span>
          </div>
        )}

        {/* ── Who it is for, and the document's own particulars ──────
            "inline" keeps both in one box, which is the ledger bill. "cards"
            splits them into two boxes side by side — the shape a formal tax
            invoice is read in. "letter" drops the box around the party and
            opens the page with it, the way correspondence does. */}

        {partyStyle === "inline" && (
          <div style={{ border: RULE, borderRadius: theme.radius, padding: "7px 9px", marginBottom: 9 }}>
            <div style={{ display: "flex", gap: 22, marginBottom: 6 }}>
              <HeadField theme={theme} label={docTitle.toUpperCase().includes("INVOICE") ? "Bill #" : "No"} value={docNo} flex={1} />
              <HeadField theme={theme} label="Date" value={date} flex={1} />
              {dueDate ? <HeadField theme={theme} label="Due" value={dueDate} flex={1} /> : null}
              {status ? <HeadField theme={theme} label="Type" value={status.toUpperCase()} flex={1} /> : null}
            </div>
            <div style={{ marginBottom: 6 }}>
              <HeadField
                theme={theme}
                label={partyLabel}
                value={
                  <span>
                    {partyName}
                    {partyLine ? <span className="pdoc-label" style={{ fontWeight: 400, fontSize: 9 }}>{"   "}{partyLine}</span> : null}
                  </span>
                }
                flex={1}
              />
            </div>
            {metaFields.length > 0 && (
              <div style={{ display: "flex", gap: 22, flexWrap: "wrap", marginBottom: 6 }}>
                {metaFields.map((f, i) => <HeadField theme={theme} key={i} label={f.label} value={f.value} flex={1} />)}
              </div>
            )}
            <HeadField theme={theme} label="Remarks" value={notes || ""} flex={1} />
          </div>
        )}

        {partyStyle === "cards" && (
          <div style={{ display: "flex", gap: 9, marginBottom: 9, alignItems: "stretch" }}>
            <div style={{ flex: 1, minWidth: 0, border: RULE, borderRadius: theme.radius, padding: "7px 9px" }}>
              <div className="pdoc-label" style={{ fontSize: 8.5, letterSpacing: 0.6, textTransform: "uppercase", marginBottom: 3 }}>{partyLabel}</div>
              <div style={{ fontSize: 11.5, fontWeight: 700, lineHeight: 1.25 }}>{partyName}</div>
              {pAddress && <div className="pdoc-label" style={{ fontSize: 9, marginTop: 2, lineHeight: 1.45 }}>{pAddress}</div>}
              {pPhone && <div className="pdoc-label" style={{ fontSize: 9, lineHeight: 1.45 }}>Tel: {pPhone}</div>}
              {(pNtn || pStrn) && (
                <div style={{ fontSize: 9, marginTop: 2, lineHeight: 1.45, fontWeight: 700 }}>
                  {pNtn ? `NTN: ${pNtn}` : ""}{pStrn ? `${pNtn ? "   " : ""}STRN: ${pStrn}` : ""}
                </div>
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0, border: RULE, borderRadius: theme.radius, padding: "7px 9px" }}>
              <div style={{ display: "flex", gap: 18, marginBottom: 5 }}>
                <HeadField theme={theme} label={docTitle.toUpperCase().includes("INVOICE") ? "Bill #" : "No"} value={docNo} flex={1} />
                <HeadField theme={theme} label="Date" value={date} flex={1} />
              </div>
              {(dueDate || status) && (
                <div style={{ display: "flex", gap: 18, marginBottom: 5 }}>
                  {dueDate ? <HeadField theme={theme} label="Due" value={dueDate} flex={1} /> : null}
                  {status ? <HeadField theme={theme} label="Type" value={status.toUpperCase()} flex={1} /> : null}
                </div>
              )}
              {metaFields.length > 0 && (
                <div style={{ display: "flex", gap: 18, flexWrap: "wrap", marginBottom: 5 }}>
                  {metaFields.map((f, i) => <HeadField theme={theme} key={i} label={f.label} value={f.value} flex={1} />)}
                </div>
              )}
              {notes ? <HeadField theme={theme} label="Remarks" value={notes} flex={1} /> : null}
            </div>
          </div>
        )}

        {partyStyle === "letter" && (
          <div style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 24, alignItems: "flex-start" }}>
              <div style={{ minWidth: 0 }}>
                <div className="pdoc-label" style={{ fontSize: 8.5, letterSpacing: 0.6, textTransform: "uppercase", marginBottom: 2 }}>{partyLabel}</div>
                <div style={{ fontSize: 12, fontWeight: 700, lineHeight: 1.25 }}>{partyName}</div>
                {pAddress && <div className="pdoc-label" style={{ fontSize: 9, marginTop: 1, lineHeight: 1.5 }}>{pAddress}</div>}
                {pPhone && <div className="pdoc-label" style={{ fontSize: 9, lineHeight: 1.5 }}>Tel: {pPhone}</div>}
                {(pNtn || pStrn) && (
                  <div className="pdoc-label" style={{ fontSize: 9, lineHeight: 1.5 }}>
                    {pNtn ? `NTN: ${pNtn}` : ""}{pStrn ? `${pNtn ? "   " : ""}STRN: ${pStrn}` : ""}
                  </div>
                )}
              </div>
              <div style={{ textAlign: "right", fontSize: 9, lineHeight: 1.7, whiteSpace: "nowrap" }}>
                <div><span className="pdoc-label">No </span><b>{docNo}</b></div>
                <div><span className="pdoc-label">Date </span><b>{date}</b></div>
                {dueDate ? <div><span className="pdoc-label">Due </span><b>{dueDate}</b></div> : null}
                {status ? <div><span className="pdoc-label">Type </span><b>{status.toUpperCase()}</b></div> : null}
                {metaFields.map((f, i) => <div key={i}><span className="pdoc-label">{f.label} </span><b>{f.value}</b></div>)}
              </div>
            </div>
            {notes && (
              <div style={{ fontSize: 9, marginTop: 7, lineHeight: 1.5 }}>
                <span className="pdoc-label" style={{ fontWeight: 700 }}>Remarks: </span>{notes}
              </div>
            )}
          </div>
        )}

        {/* ── The order itself ─────────────────────────────────────── */}
        <table className={`pdoc-grid pdoc-g-${gridStyle}`} style={{ width: "100%", borderCollapse: "collapse", fontSize: 9.5, marginBottom: 10 }}>
          <thead>
            {hasColumnGroups && (
              <tr>
                {columnSegments.map((seg, i) =>
                  seg.group ? (
                    <th
                      key={i}
                      colSpan={seg.cols.length}
                      style={{
                        border: RULE, padding: cellPad, textAlign: "center",
                        fontSize: 8.5, fontWeight: 700, letterSpacing: 0.3,
                        whiteSpace: "nowrap", background: theme.headBg, color: theme.headInk,
                      }}
                    >
                      {seg.group}
                    </th>
                  ) : (
                    <th
                      key={seg.cols[0].key}
                      rowSpan={2}
                      style={{
                        border: RULE, padding: cellPad, width: seg.cols[0].width,
                        textAlign: (seg.cols[0].align || "left") as any,
                        fontSize: 8.5, fontWeight: 700, letterSpacing: 0.3,
                        whiteSpace: "nowrap", background: theme.headBg, color: theme.headInk,
                      }}
                    >
                      {seg.cols[0].label}
                    </th>
                  )
                )}
              </tr>
            )}
            <tr>
              {(hasColumnGroups ? columns.filter((c) => c.group) : columns).map((c) => (
                <th
                  key={c.key}
                  style={{
                    border: RULE, padding: cellPad, width: c.width,
                    textAlign: (c.align || "left") as any,
                    fontSize: 8.5, fontWeight: 700, letterSpacing: 0.3,
                    whiteSpace: "nowrap", background: theme.headBg, color: theme.headInk,
                  }}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className={gridStyle === "zebra" && i % 2 === 1 ? "pdoc-zebra" : undefined}>
                {columns.map((c, ci) => (
                  <td
                    key={c.key}
                    style={{
                      border: RULE, padding: cellPad,
                      textAlign: (c.align || "left") as any,
                      verticalAlign: "top",
                      // Only the description may wrap. A figure that wraps turns
                      // a one-line row into three and the grid stops scanning.
                      whiteSpace: ci === 0 ? "normal" : "nowrap",
                    }}
                  >
                    {c.render ? c.render(row[c.key], row, i) : (row[c.key] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={columns.length} style={{ border: RULE, textAlign: "center", padding: 10, fontSize: 9.5 }}>No items</td></tr>
            )}
          </tbody>
        </table>

        {/* ── The foot of the sheet ────────────────────────────────────
            Pushed to the bottom of the page rather than left hanging under
            the last line item: a bill is signed at the foot of the paper,
            and on a three-line order the signatures would otherwise sit
            half way up an empty page. */}
        <div style={{ marginTop: "auto", paddingTop: 18 }}>

          {/* What was counted, and what it comes to. Both boxed and level with
              each other, the way the old bill closed the page off. */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 24, marginBottom: 16 }}>
            {summaryFields.length > 0 && on("summary") ? (
              <table className="pdoc-summary" style={{ borderCollapse: "collapse", border: RULE, borderRadius: theme.radius }}>
                <tbody>
                  {summaryFields.map((f, i) => (
                    <tr key={i}>
                      <td className="pdoc-label" style={{ padding: "3px 10px 3px 8px", fontSize: 9, whiteSpace: "nowrap" }}>{f.label} :</td>
                      <td style={{ padding: "3px 12px 3px 0", fontSize: 10.5, fontWeight: 700, whiteSpace: "nowrap", textAlign: "right" }}>{f.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <div />}

            {/* "boxed" rules the whole block off as one object; "right" and
                "bar" leave it free-standing and differ only in how the net
                figure is set, which the row below decides. */}
            <table
              className="pdoc-totals"
              style={{
                borderCollapse: "collapse",
                minWidth: 210,
                ...(totalsStyle === "boxed"
                  ? { border: RULE, borderRadius: theme.radius, padding: 0 }
                  : {}),
              }}
            >
              <tbody>
                {totalsLines.map((line, i) => {
                  // The net figure is the one thing the customer looks for, so
                  // a design may set it in a filled bar instead of ruling it.
                  const filled = Boolean(line.bold && totalsStyle === "bar" && theme.netFill);
                  const cell: React.CSSProperties = {
                    fontSize: line.bold ? 11 : 9.5,
                    fontWeight: line.bold ? 700 : 400,
                    ...(filled
                      ? { background: theme.netFill as string, color: theme.netInk, padding: "5px 10px" }
                      : { padding: "2px 0", borderTop: line.borderTop ? RULE : undefined }),
                  };
                  return (
                    <tr key={i} className={filled ? "pdoc-net" : undefined}>
                      <td
                        className={line.borderTop && !filled ? "pdoc-ruled" : undefined}
                        style={{ ...cell, textAlign: "right", paddingRight: filled ? 12 : 12 }}
                      >
                        {line.label}
                      </td>
                      <td
                        className={line.borderTop && !filled ? "pdoc-ruled" : undefined}
                        style={{ ...cell, textAlign: "right", minWidth: 88 }}
                      >
                        {fmt(line.value)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ── How the sheet closes ───────────────────────────────
              The amount spelled out and the terms are the bulk of the foot, so
              grouping them is what makes one design's bottom third read
              differently from another's. "boxed" rules them together the way a
              formal invoice closes; "quiet" gives them no furniture at all. */}
          {(() => {
            const amountEl = amountInWords && on("amountInWords") ? (
              <div style={{ fontSize: footerStyle === "quiet" ? 8 : 8.5, lineHeight: 1.5 }}>
                <span className="pdoc-label" style={{ fontWeight: 700 }}>Amount: </span>{amountInWords}
              </div>
            ) : null;
            const termsEl = terms && on("terms") ? (
              <div style={{ fontSize: 8.5, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
                <span className="pdoc-label" style={{ fontWeight: 700 }}>Terms: </span>{terms}
              </div>
            ) : null;
            if (!amountEl && !termsEl) return null;

            if (footerStyle === "boxed") {
              return (
                <div style={{ border: RULE, borderRadius: theme.radius, padding: "6px 9px", marginBottom: 12, display: "flex", flexDirection: "column", gap: 4 }}>
                  {amountEl}
                  {termsEl}
                </div>
              );
            }
            return (
              <div style={{ display: "flex", flexDirection: "column", gap: footerStyle === "quiet" ? 3 : 8, marginBottom: 12 }}>
                {amountEl}
                {termsEl}
              </div>
            );
          })()}

          {/* How many lines get signed, and where. Three across is the goods
              document — issued, checked, received. A quotation nobody signs on
              delivery only needs the one, and putting it right keeps the foot
              of the sheet from looking like a form waiting to be filled in. */}
          {signatureLabels && signatureLabels.length > 0 && on("signatures") && (() => {
            const count = signatureStyle === "three" ? 3 : signatureStyle === "two_right" ? 2 : 1;
            const shown = signatureLabels.slice(0, count);
            const rightAligned = signatureStyle !== "three";
            return (
              <div style={{ display: "flex", justifyContent: rightAligned ? "flex-end" : "space-between", gap: 30 }}>
                {shown.map((lbl) => (
                  <div key={lbl} style={{ flex: rightAligned ? "0 0 170px" : 1, textAlign: "center" }}>
                    <div className="pdoc-sig-line" style={{ borderTop: `1px solid ${theme.ink}`, margin: "0 auto 4px", maxWidth: 150 }} />
                    <div className="pdoc-label" style={{ fontSize: 8.5 }}>{lbl}</div>
                  </div>
                ))}
              </div>
            );
          })()}

          {/* The company's own footer note, and nothing else.
              
              Documents used to close with a "Powered by …" mark. It came off
              every print: these go out to a customer on the company's own
              letterhead, and the software that produced them has no business
              signing them. The five arrangements stay — they lay out the
              note — and theme.poweredChip is now unused rather than removed,
              so a stored print preference does not have to be migrated. */}
          {(() => {
            const note = footerNote && on("footerNote") ? footerNote : "";
            const mark = null;

            if (footerStyle === "band") {
              return (
                <div
                  className="pdoc-band"
                  style={{
                    marginTop: 14, background: theme.bandBg, color: theme.bandInk,
                    padding: "5px 10px", borderRadius: theme.radius,
                    display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12,
                  }}
                >
                  <span style={{ fontSize: 8.5, fontStyle: "italic" }}>{note}</span>
                </div>
              );
            }

            if (footerStyle === "split") {
              return (
                <div style={{ marginTop: 12, borderTop: RULE, paddingTop: 5, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                  <span className="pdoc-label" style={{ fontSize: 8.5, fontStyle: "italic" }}>{note}</span>
                  {mark}
                </div>
              );
            }

            if (footerStyle === "quiet") {
              return (
                <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
                  <span className="pdoc-label" style={{ fontSize: 8 }}>{note}</span>
                  {mark}
                </div>
              );
            }

            // "centered" and "boxed" both close the sheet down the middle.
            return (
              <>
                {note && (
                  <div className="pdoc-label" style={{ textAlign: "center", fontSize: 8.5, marginTop: 14, fontStyle: "italic" }}>{note}</div>
                )}
                <div style={{ textAlign: "center", marginTop: 6 }}>{mark}</div>
              </>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

// ─── Print wrapper (paper on screen, plain ink on paper) ─────────────────────

export function PrintPaperWrapper({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`
        .print-doc-a4,
        .print-doc-a4 * {
          font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif !important;
          color: var(--pdoc-ink, #111) !important;
        }
        .print-doc-a4 { background: #fff !important; }

        /* A4 is about 718 CSS pixels wide once the margins are off, so every
           "@media (max-width: 767px)" rule the dashboard has for phones fires
           on paper as well. One of them turns every table into a horizontally
           scrolling block — which on paper shrinks the grid to its content and
           strands the totals against the left margin. A printed document is
           not a small screen: it gets its tables back. */
        html.dark .dashboard-root .print-doc-a4 table,
        html:not(.dark) .dashboard-root .print-doc-a4 table,
        .print-doc-a4 table {
          display: table !important;
          overflow: visible !important;
          min-width: 0 !important;
        }
        html.dark .dashboard-root .print-doc-a4 .pdoc-grid,
        html:not(.dark) .dashboard-root .print-doc-a4 .pdoc-grid,
        .print-doc-a4 .pdoc-grid { width: 100% !important; table-layout: auto !important; }
        html.dark .dashboard-root .print-doc-a4 .pdoc-totals,
        html:not(.dark) .dashboard-root .print-doc-a4 .pdoc-totals,
        .print-doc-a4 .pdoc-totals { width: auto !important; }
        /* Same block wraps every flex row it can find; the letterhead, the
           header box and the signature row are meant to stay on one line. */
        .print-doc-a4 [style*="display:flex"],
        .print-doc-a4 [style*="display: flex"] { flex-wrap: nowrap !important; }

        /* The document sits inside the dashboard, and the dashboard's dark
           theme repaints every table it can reach — "html.dark .dashboard-root
           th" turned this grid's headings into translucent white on white and
           washed the cell rules out to nothing. These have to out-specify it,
           hence the long selectors: a printed bill is the company's chosen ink
           on white paper, whatever the screen around it is wearing. */
        html.dark .dashboard-root .print-doc-a4 .pdoc-grid th,
        html:not(.dark) .dashboard-root .print-doc-a4 .pdoc-grid th,
        .print-doc-a4 .pdoc-grid th {
          background-color: var(--pdoc-head-bg, #f2f2f2) !important;
          color: var(--pdoc-head-ink, #111) !important;
          border: 1px solid var(--pdoc-rule, #111) !important;
        }
        html.dark .dashboard-root .print-doc-a4 .pdoc-grid td,
        html:not(.dark) .dashboard-root .print-doc-a4 .pdoc-grid td,
        .print-doc-a4 .pdoc-grid td {
          color: var(--pdoc-ink, #111) !important;
          border: 1px solid var(--pdoc-rule, #111) !important;
          background-color: transparent !important;
        }
        html.dark .dashboard-root .print-doc-a4 .pdoc-grid tr.pdoc-zebra td,
        html:not(.dark) .dashboard-root .print-doc-a4 .pdoc-grid tr.pdoc-zebra td,
        .print-doc-a4 .pdoc-grid tr.pdoc-zebra td { background-color: var(--pdoc-zebra, transparent) !important; }

        /* ── How the order is ruled ────────────────────────────────
           The block above boxes every cell, which is the ledger grid and the
           default. A design that wants open rows has to out-specify it, hence
           the same long selectors again: the dashboard's own table styling
           sits between this sheet and the browser.

           Only the rules change. Column order, widths and alignment stay put
           across every design, so an operator who has learned where the rate
           column sits never has to look for it again. */

        /* rows — horizontal rules only, no verticals between columns. */
        .print-doc-a4 .pdoc-g-rows th,
        html.dark .dashboard-root .print-doc-a4 .pdoc-g-rows th,
        html:not(.dark) .dashboard-root .print-doc-a4 .pdoc-g-rows th {
          border: 0 !important;
          border-bottom: 1px solid var(--pdoc-rule, #111) !important;
        }
        .print-doc-a4 .pdoc-g-rows td,
        html.dark .dashboard-root .print-doc-a4 .pdoc-g-rows td,
        html:not(.dark) .dashboard-root .print-doc-a4 .pdoc-g-rows td {
          border: 0 !important;
          border-bottom: 1px solid var(--pdoc-rule, #111) !important;
        }

        /* zebra — the fill separates the rows, so no rules inside the body. */
        .print-doc-a4 .pdoc-g-zebra th,
        html.dark .dashboard-root .print-doc-a4 .pdoc-g-zebra th,
        html:not(.dark) .dashboard-root .print-doc-a4 .pdoc-g-zebra th {
          border: 0 !important;
          border-bottom: 1px solid var(--pdoc-rule, #111) !important;
        }
        .print-doc-a4 .pdoc-g-zebra td,
        html.dark .dashboard-root .print-doc-a4 .pdoc-g-zebra td,
        html:not(.dark) .dashboard-root .print-doc-a4 .pdoc-g-zebra td { border: 0 !important; }
        .print-doc-a4 .pdoc-g-zebra tbody tr:last-child td,
        html.dark .dashboard-root .print-doc-a4 .pdoc-g-zebra tbody tr:last-child td,
        html:not(.dark) .dashboard-root .print-doc-a4 .pdoc-g-zebra tbody tr:last-child td {
          border-bottom: 1px solid var(--pdoc-rule, #111) !important;
        }

        /* open — a rule under the headings, one under the last line, nothing
           else. The whitespace does the work the rules used to. */
        .print-doc-a4 .pdoc-g-open th,
        html.dark .dashboard-root .print-doc-a4 .pdoc-g-open th,
        html:not(.dark) .dashboard-root .print-doc-a4 .pdoc-g-open th {
          border: 0 !important;
          border-bottom: 1px solid var(--pdoc-rule, #111) !important;
          background-color: transparent !important;
          color: var(--pdoc-ink, #111) !important;
        }
        .print-doc-a4 .pdoc-g-open td,
        html.dark .dashboard-root .print-doc-a4 .pdoc-g-open td,
        html:not(.dark) .dashboard-root .print-doc-a4 .pdoc-g-open td { border: 0 !important; }
        .print-doc-a4 .pdoc-g-open tbody tr:last-child td,
        html.dark .dashboard-root .print-doc-a4 .pdoc-g-open tbody tr:last-child td,
        html:not(.dark) .dashboard-root .print-doc-a4 .pdoc-g-open tbody tr:last-child td {
          border-bottom: 1px solid var(--pdoc-rule, #111) !important;
        }

        /* The totals stand free of the grid: one rule above the net figure,
           or the filled bar a template asks for. */
        html.dark .dashboard-root .print-doc-a4 .pdoc-totals td,
        html:not(.dark) .dashboard-root .print-doc-a4 .pdoc-totals td,
        .print-doc-a4 .pdoc-totals td {
          color: var(--pdoc-ink, #111) !important;
          border: 0 !important;
          background-color: transparent !important;
        }
        html.dark .dashboard-root .print-doc-a4 .pdoc-totals td.pdoc-ruled,
        html:not(.dark) .dashboard-root .print-doc-a4 .pdoc-totals td.pdoc-ruled,
        .print-doc-a4 .pdoc-totals td.pdoc-ruled { border-top: 1px solid var(--pdoc-rule, #111) !important; }

        /* The counted summary is boxed as a whole, not cell by cell. */
        html.dark .dashboard-root .print-doc-a4 .pdoc-summary,
        html:not(.dark) .dashboard-root .print-doc-a4 .pdoc-summary,
        .print-doc-a4 .pdoc-summary { width: auto !important; border: 1px solid var(--pdoc-rule, #111) !important; }
        html.dark .dashboard-root .print-doc-a4 .pdoc-summary td,
        html:not(.dark) .dashboard-root .print-doc-a4 .pdoc-summary td,
        .print-doc-a4 .pdoc-summary td {
          color: var(--pdoc-ink, #111) !important;
          border: 0 !important;
          background-color: transparent !important;
        }

        html.dark .dashboard-root .print-doc-a4 tr:hover td,
        .print-doc-a4 tr:hover td { background-color: transparent !important; }

        .print-doc-a4 .pdoc-label { color: var(--pdoc-muted, #555) !important; }

        /* Reversed ink: a filled band, a filled net-bill bar, a filled chip.
           These have to beat the blanket "everything is --pdoc-ink" above. */
        .print-doc-a4 .pdoc-band,
        .print-doc-a4 .pdoc-band * { color: inherit !important; }
        html.dark .dashboard-root .print-doc-a4 .pdoc-net td,
        html:not(.dark) .dashboard-root .print-doc-a4 .pdoc-net td,
        .print-doc-a4 .pdoc-net td { color: inherit !important; }
        .print-doc-a4 .pdoc-powered,
        .print-doc-a4 .pdoc-powered * { color: inherit !important; }

        @media screen {
          .print-paper-wrapper {
            background: #e9edf2;
            padding: 24px;
            overflow: auto;
          }
          .print-doc-a4 {
            box-shadow: 0 4px 24px rgba(0,0,0,0.12);
          }
        }

        @media print {
          .print-paper-wrapper { background: #fff !important; padding: 0 !important; }
          .print-doc-a4 {
            box-shadow: none !important;
            width: auto !important;
            /* Fills the sheet so the signatures sit at the foot of the paper,
               not under the last line item. */
            min-height: 100% !important;
            padding: 0 !important;
          }
          /* A band runs to the paper's edge on screen; on paper the printer's
             own margin is the edge, so it keeps its inner padding only. */
          .print-doc-a4 .pdoc-band { padding: 5mm 6mm !important; }
          .print-doc-a4 .pdoc-grid th,
          .print-doc-a4 .pdoc-net td,
          .print-doc-a4 .pdoc-band,
          .print-doc-a4 .pdoc-powered,
          .print-doc-a4 .pdoc-grid tr.pdoc-zebra td {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .print-doc-a4 tr { page-break-inside: avoid; }
          .print-doc-a4 thead { display: table-header-group; }
        }
      `}</style>
      <div className="print-paper-wrapper">
        {children}
      </div>
    </>
  );
}
