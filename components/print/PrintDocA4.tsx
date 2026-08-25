"use client";
import React from "react";

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
 * So: black on white, one hairline rule between everything, and every
 * millimetre of the paper spent on the figures. Nothing is dropped — the
 * notes, terms, meta fields, logo and status a document passes still print;
 * they simply sit where the old bill put them.
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

  // Footer
  notes?: string;
  terms?: string;
  footerNote?: string;

  // Signature lines (optional)
  signatureLabels?: string[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Hairline. Every rule on the page is this one, so nothing shouts. */
const RULE = "1px solid #111";

/** One particular in the header box: "Bill # :  6", ruled the way a form is. */
function HeadField({ label, value, flex }: { label: string; value: React.ReactNode; flex?: number | string }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 6, flex: flex ?? "0 0 auto", minWidth: 0 }}>
      <span className="pdoc-label" style={{ fontSize: 9, letterSpacing: 0.3, whiteSpace: "nowrap" }}>{label} :</span>
      <span style={{ fontSize: 10.5, fontWeight: 700, borderBottom: "1px solid #999", flex: 1, minWidth: 40, paddingBottom: 1 }}>
        {value || " "}
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
  notes,
  terms,
  footerNote,
  signatureLabels,
}: PrintDocA4Props) {
  const partyLine = [partyAddress, partyPhone ? `Tel: ${partyPhone}` : "", partyNtn ? `NTN: ${partyNtn}` : ""]
    .filter(Boolean).join("   ");

  return (
    <div className="print-doc-a4" style={{ width: "210mm", minHeight: "297mm", boxSizing: "border-box", margin: "0 auto", background: "#fff", color: "#111", padding: "10mm 10mm 8mm" }}>

      {/* ── Letterhead: who is billing, and what this is ─────────── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <div style={{ minWidth: 0 }}>
          {showLogo && logoUrl
            ? <img src={logoUrl} alt="" style={{ maxHeight: 34, maxWidth: 120, objectFit: "contain", marginBottom: 4, display: "block" }} />
            : null}
          <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: 0.4, lineHeight: 1.1 }}>{companyName}</div>
          {(companyAddress || companyPhone || companyEmail) && (
            <div className="pdoc-label" style={{ fontSize: 8.5, marginTop: 2, lineHeight: 1.45 }}>
              {companyAddress}
              {companyPhone ? `${companyAddress ? "  ·  " : ""}Tel: ${companyPhone}` : ""}
              {companyEmail ? `  ·  ${companyEmail}` : ""}
            </div>
          )}
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1.6, textTransform: "uppercase" }}>{docTitle}</div>
          <div className="pdoc-label" style={{ fontSize: 8.5, marginTop: 3 }}>{date}</div>
        </div>
      </div>

      {/* ── Header box: the document's own particulars ───────────── */}
      <div style={{ border: RULE, padding: "7px 9px", marginBottom: 9 }}>
        <div style={{ display: "flex", gap: 22, marginBottom: 6 }}>
          <HeadField label={docTitle.toUpperCase().includes("INVOICE") ? "Bill #" : "No"} value={docNo} flex={1} />
          <HeadField label="Date" value={date} flex={1} />
          {dueDate ? <HeadField label="Due" value={dueDate} flex={1} /> : null}
          {status ? <HeadField label="Type" value={status.toUpperCase()} flex={1} /> : null}
        </div>
        <div style={{ marginBottom: 6 }}>
          <HeadField
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
            {metaFields.map((f, i) => <HeadField key={i} label={f.label} value={f.value} flex={1} />)}
          </div>
        )}
        <HeadField label="Remarks" value={notes || ""} flex={1} />
      </div>

      {/* ── The order itself ─────────────────────────────────────── */}
      <table className="pdoc-grid" style={{ width: "100%", borderCollapse: "collapse", fontSize: 9.5, marginBottom: 10 }}>
        <thead>
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                style={{
                  border: RULE, padding: "3px 5px", width: c.width,
                  textAlign: (c.align || "left") as any,
                  fontSize: 8.5, fontWeight: 700, letterSpacing: 0.3,
                  whiteSpace: "nowrap", background: "#f2f2f2",
                }}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {columns.map((c, ci) => (
                <td
                  key={c.key}
                  style={{
                    border: RULE, padding: "3px 5px",
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

      {/* ── Totals, against the right margin where they are read ── */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
        <table style={{ borderCollapse: "collapse", minWidth: 210 }}>
          <tbody>
            {totalsLines.map((line, i) => (
              <tr key={i}>
                <td style={{ padding: "2px 12px 2px 0", textAlign: "right", fontSize: line.bold ? 11 : 9.5, fontWeight: line.bold ? 700 : 400, borderTop: line.borderTop ? RULE : undefined }}>
                  {line.label}
                </td>
                <td style={{ padding: "2px 0", textAlign: "right", fontSize: line.bold ? 11 : 9.5, fontWeight: line.bold ? 700 : 400, minWidth: 88, borderTop: line.borderTop ? RULE : undefined }}>
                  {fmt(line.value)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Terms, where a bill keeps them: small, at the foot ───── */}
      {terms && (
        <div style={{ fontSize: 8.5, lineHeight: 1.5, whiteSpace: "pre-wrap", marginBottom: 12 }}>
          <span className="pdoc-label" style={{ fontWeight: 700 }}>Terms: </span>{terms}
        </div>
      )}

      {/* ── Signatures ───────────────────────────────────────────── */}
      {signatureLabels && signatureLabels.length > 0 && (
        <div style={{ display: "flex", justifyContent: "space-between", gap: 30, marginTop: 26 }}>
          {signatureLabels.map((lbl) => (
            <div key={lbl} style={{ flex: 1, textAlign: "center" }}>
              <div className="pdoc-sig-line" style={{ borderTop: "1px solid #111", margin: "0 auto 4px", maxWidth: 150 }} />
              <div className="pdoc-label" style={{ fontSize: 8.5 }}>{lbl}</div>
            </div>
          ))}
        </div>
      )}

      {footerNote && (
        <div className="pdoc-label" style={{ textAlign: "center", fontSize: 8, marginTop: 14 }}>{footerNote}</div>
      )}

      {/* "Powered by FinovaOS" is printed on every page by the app-wide
          print footer in app/globals.css, so it is not repeated here. */}
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
          color: #111 !important;
        }
        .print-doc-a4 { background: #fff !important; }
        .print-doc-a4 .pdoc-label { color: #555 !important; }
        .print-doc-a4 .pdoc-powered { color: #777 !important; }
        .print-doc-a4 .pdoc-grid th { background: #f2f2f2 !important; }

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
            min-height: 0 !important;
            padding: 0 !important;
          }
          .print-doc-a4 .pdoc-label { color: #333 !important; }
          .print-doc-a4 .pdoc-powered { color: #666 !important; }
          .print-doc-a4 .pdoc-grid th {
            background: #eee !important;
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
