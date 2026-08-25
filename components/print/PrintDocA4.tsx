"use client";
import React from "react";
import { printTheme, type PrintTemplateId, type PrintTheme } from "./printTemplates";

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
};

export type PrintTotalsLine = { label: string; value: number; bold?: boolean; borderTop?: boolean };

export interface PrintDocA4Props {
  // Company
  companyName: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
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

  // Footer
  notes?: string;
  terms?: string;
  footerNote?: string;

  // Signature lines (optional)
  signatureLabels?: string[];

  /** The company's chosen look. See ./printTemplates.ts. */
  template?: PrintTemplateId | string;
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
  metaFields = [],
  columns,
  rows,
  totalsLines,
  summaryFields = [],
  notes,
  terms,
  footerNote,
  signatureLabels,
  template,
}: PrintDocA4Props) {
  const theme = printTheme(template);
  const RULE = `1px solid ${theme.rule}`;
  const banded = theme.band === "solid";

  const partyLine = [partyAddress, partyPhone ? `Tel: ${partyPhone}` : "", partyNtn ? `NTN: ${partyNtn}` : ""]
    .filter(Boolean).join("   ");

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

      {/* ── Letterhead: who is billing, and what this is ─────────── */}
      <div
        className={banded ? "pdoc-band" : undefined}
        style={{
          display: "flex", justifyContent: "space-between",
          alignItems: banded ? "center" : "flex-start",
          marginBottom: banded ? 0 : 10,
          ...(banded
            ? { background: theme.bandBg, color: theme.bandInk, padding: "7mm 10mm" }
            : {}),
        }}
      >
        <div style={{ minWidth: 0, display: "flex", alignItems: "center", gap: 10 }}>
          {showLogo && logoUrl
            ? <img src={logoUrl} alt="" style={{ maxHeight: 38, maxWidth: 120, objectFit: "contain", display: "block" }} />
            : null}
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: 0.4, lineHeight: 1.1 }}>{companyName}</div>
            {(companyAddress || companyPhone || companyEmail) && (
              <div className={banded ? undefined : "pdoc-label"} style={{ fontSize: 8.5, marginTop: 2, lineHeight: 1.45, opacity: banded ? 0.85 : 1 }}>
                {companyAddress}
                {companyPhone ? `${companyAddress ? "  ·  " : ""}Tel: ${companyPhone}` : ""}
                {companyEmail ? `  ·  ${companyEmail}` : ""}
              </div>
            )}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: banded ? 14 : 12, fontWeight: 800, letterSpacing: 1.6, textTransform: "uppercase" }}>{docTitle}</div>
          <div className={banded ? undefined : "pdoc-label"} style={{ fontSize: 8.5, marginTop: 3, opacity: banded ? 0.85 : 1 }}>{date}</div>
        </div>
      </div>

      {/* Everything below the band keeps the page's own margins. */}
      <div style={{ padding: banded ? "8mm 10mm 0" : 0, display: "flex", flexDirection: "column", flex: 1 }}>

        {theme.titleAlign === "center" && !banded && (
          <div style={{ textAlign: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2.2, textTransform: "uppercase", borderTop: RULE, borderBottom: RULE, padding: "3px 14px", display: "inline-block" }}>
              {docTitle}
            </span>
          </div>
        )}

        {/* ── Header box: the document's own particulars ───────────── */}
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

        {/* ── The order itself ─────────────────────────────────────── */}
        <table className="pdoc-grid" style={{ width: "100%", borderCollapse: "collapse", fontSize: 9.5, marginBottom: 10 }}>
          <thead>
            <tr>
              {columns.map((c) => (
                <th
                  key={c.key}
                  style={{
                    border: RULE, padding: theme.cellPad, width: c.width,
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
              <tr key={i} className={theme.zebra && i % 2 === 1 ? "pdoc-zebra" : undefined}>
                {columns.map((c, ci) => (
                  <td
                    key={c.key}
                    style={{
                      border: RULE, padding: theme.cellPad,
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
            {summaryFields.length > 0 ? (
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

            <table className="pdoc-totals" style={{ borderCollapse: "collapse", minWidth: 210 }}>
              <tbody>
                {totalsLines.map((line, i) => {
                  // The net figure is the one thing the customer looks for, so
                  // a template may set it in a filled bar instead of ruling it.
                  const filled = Boolean(line.bold && theme.netFill);
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

          {terms && (
            <div style={{ fontSize: 8.5, lineHeight: 1.5, whiteSpace: "pre-wrap", marginBottom: 12 }}>
              <span className="pdoc-label" style={{ fontWeight: 700 }}>Terms: </span>{terms}
            </div>
          )}

          {signatureLabels && signatureLabels.length > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", gap: 30 }}>
              {signatureLabels.map((lbl) => (
                <div key={lbl} style={{ flex: 1, textAlign: "center" }}>
                  <div className="pdoc-sig-line" style={{ borderTop: `1px solid ${theme.ink}`, margin: "0 auto 4px", maxWidth: 150 }} />
                  <div className="pdoc-label" style={{ fontSize: 8.5 }}>{lbl}</div>
                </div>
              ))}
            </div>
          )}

          {footerNote && (
            <div className="pdoc-label" style={{ textAlign: "center", fontSize: 8.5, marginTop: 14, fontStyle: "italic" }}>{footerNote}</div>
          )}

          {/* Every document this system prints says where it came from. The
              app-wide print footer stands down when this line is on the page
              (see app/globals.css) so it is never printed twice. */}
          <div style={{ textAlign: "center", marginTop: 6 }}>
            <span
              className="pdoc-powered"
              style={theme.poweredChip
                ? { display: "inline-block", background: theme.ink, color: "#fff", fontSize: 8, letterSpacing: 0.4, padding: "3px 12px", borderRadius: theme.radius }
                : { fontSize: 8.5, letterSpacing: 0.4 }}
            >
              Powered by <b>FinovaOS</b>
            </span>
          </div>
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
