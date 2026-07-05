"use client";
import React from "react";

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
  return (
    <div className="print-doc-a4" style={{ width: "210mm", minHeight: "297mm", boxSizing: "border-box", margin: "0 auto", background: "#fff" }}>

      {/* ── Coloured header band ─────────────────────────────────── */}
      <div className="pdoc-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "14px 20px 14px", marginBottom: 0 }}>
        <div>
          {showLogo && logoUrl
            ? <img src={logoUrl} alt="logo" style={{ maxHeight: 44, maxWidth: 130, marginBottom: 6, objectFit: "contain" }} />
            : null}
          <div style={{ fontWeight: "bold", fontSize: 18, letterSpacing: 0.3 }}>{companyName}</div>
          {companyAddress && <div className="pdoc-muted" style={{ fontSize: 9.5, marginTop: 2 }}>{companyAddress}</div>}
          {companyPhone && <div className="pdoc-muted" style={{ fontSize: 9.5 }}>Tel: {companyPhone}</div>}
          {companyEmail && <div className="pdoc-muted" style={{ fontSize: 9.5 }}>{companyEmail}</div>}
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontWeight: "bold", fontSize: 22, letterSpacing: 1.5, textTransform: "uppercase" }}>{docTitle}</div>
          <div style={{ fontSize: 11, marginTop: 6 }}>
            <span className="pdoc-muted">No: </span><strong>{docNo}</strong>
          </div>
          <div style={{ fontSize: 10.5, marginTop: 2 }}>
            <span className="pdoc-muted">Date: </span>{date}
          </div>
          {dueDate && <div style={{ fontSize: 10.5, marginTop: 2 }}><span className="pdoc-muted">Due: </span>{dueDate}</div>}
          {status && (
            <div className="pdoc-status-badge" style={{ display: "inline-block", border: "1px solid #fff", padding: "2px 10px", borderRadius: 3, fontSize: 9.5, fontWeight: "bold", marginTop: 6, letterSpacing: 0.5 }}>
              {status.toUpperCase()}
            </div>
          )}
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────────── */}
      <div style={{ padding: "14px 20px 16px" }}>

        {/* Party + Meta */}
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14, paddingBottom: 12, borderBottom: "1px solid #e2e8f0" }}>
          <div style={{ flex: 1 }}>
            <div className="pdoc-party-label" style={{ fontSize: 9, fontWeight: "bold", textTransform: "uppercase", letterSpacing: 1, marginBottom: 3 }}>
              {partyLabel}
            </div>
            <div style={{ fontWeight: "bold", fontSize: 13 }}>{partyName}</div>
            {partyAddress && <div style={{ fontSize: 9.5, marginTop: 2 }}>{partyAddress}</div>}
            {partyPhone && <div style={{ fontSize: 9.5 }}>Tel: {partyPhone}</div>}
            {partyNtn && <div style={{ fontSize: 9.5 }}>NTN: {partyNtn}</div>}
          </div>
          {metaFields.length > 0 && (
            <div style={{ textAlign: "right", fontSize: 9.5, lineHeight: 1.9 }}>
              {metaFields.map((f, i) => (
                <div key={i}><span className="pdoc-party-label">{f.label}: </span><strong>{f.value}</strong></div>
              ))}
            </div>
          )}
        </div>

        {/* Items Table */}
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 12, fontSize: 9.5 }}>
          <thead>
            <tr>
              {columns.map((c, i) => (
                <th key={c.key} style={{ padding: "7px 8px", textAlign: (c.align || "left") as any, fontWeight: "bold", fontSize: 9, letterSpacing: 0.4, textTransform: "uppercase", width: c.width, borderRight: i < columns.length - 1 ? "1px solid rgba(255,255,255,0.2)" : undefined }}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className={i % 2 === 1 ? "print-row-alt" : undefined} style={{ borderBottom: "1px solid #e2e8f0" }}>
                {columns.map((c, ci) => (
                  <td key={c.key} style={{ padding: "5px 8px", textAlign: (c.align || "left") as any, borderRight: ci < columns.length - 1 ? "1px solid #e2e8f0" : undefined, verticalAlign: "middle" }}>
                    {c.render ? c.render(row[c.key], row, i) : (row[c.key] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={columns.length} style={{ textAlign: "center", padding: 16, fontSize: 10 }}>No items</td></tr>
            )}
          </tbody>
        </table>

        {/* Totals */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
          <table style={{ borderCollapse: "collapse", minWidth: 240 }}>
            <tbody>
              {totalsLines.map((line, i) => (
                <tr key={i} style={line.borderTop ? { borderTop: "2px solid #1e293b" } : {}}>
                  <td className={line.bold ? "pdoc-total-bold" : "pdoc-total-muted"} style={{ padding: `${line.borderTop ? 8 : 4}px 14px 4px 0`, textAlign: "right", fontSize: line.bold ? 12 : 10, fontWeight: line.bold ? "bold" : "normal" }}>
                    {line.label}
                  </td>
                  <td className={line.bold ? "pdoc-total-bold" : "pdoc-total-muted"} style={{ padding: `${line.borderTop ? 8 : 4}px 0 4px`, textAlign: "right", fontSize: line.bold ? 12 : 10, fontWeight: line.bold ? "bold" : "normal", minWidth: 90 }}>
                    {fmt(line.value)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Notes */}
        {notes && (
          <div className="pdoc-divider" style={{ borderTop: "1px solid #e2e8f0", paddingTop: 8, marginBottom: 10 }}>
            <div className="pdoc-party-label" style={{ fontSize: 9, fontWeight: "bold", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 }}>Notes</div>
            <div style={{ fontSize: 9.5, whiteSpace: "pre-wrap" }}>{notes}</div>
          </div>
        )}

        {/* Terms */}
        {terms && (
          <div className="pdoc-divider" style={{ borderTop: "1px solid #e2e8f0", paddingTop: 8, marginBottom: 10 }}>
            <div className="pdoc-party-label" style={{ fontSize: 9, fontWeight: "bold", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 }}>Terms & Conditions</div>
            <div style={{ fontSize: 9.5, whiteSpace: "pre-wrap" }}>{terms}</div>
          </div>
        )}

        {/* Signatures */}
        {signatureLabels && signatureLabels.length > 0 && (
          <div className="pdoc-divider" style={{ display: "flex", justifyContent: "space-around", marginTop: 28, paddingTop: 12, borderTop: "1px solid #e2e8f0" }}>
            {signatureLabels.map(lbl => (
              <div key={lbl} style={{ textAlign: "center" }}>
                <div className="pdoc-sig-line" style={{ borderTop: "1px solid #94a3b8", width: 130, margin: "0 auto 8px" }} />
                <div className="pdoc-sig-label" style={{ fontSize: 9.5 }}>{lbl}</div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        {footerNote && (
          <div className="print-footer-note pdoc-divider" style={{ textAlign: "center", borderTop: "1px solid #e2e8f0", paddingTop: 8, marginTop: 14, fontSize: 8.5 }}>
            {footerNote}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Print wrapper (adds paper shadow on screen, clean on print) ─────────────

export function PrintPaperWrapper({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`
        /* ── Screen: override dark-mode, keep colourful design ── */
        .print-doc-a4 {
          color: #111 !important;
          background: #fff !important;
          font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif !important;
        }
        .print-doc-a4 * {
          font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif !important;
        }
        .print-doc-a4 .pdoc-header {
          background: #1e293b !important;
          color: #fff !important;
        }
        .print-doc-a4 .pdoc-header * {
          color: #fff !important;
        }
        .print-doc-a4 .pdoc-header .pdoc-muted {
          color: #94a3b8 !important;
        }
        .print-doc-a4 thead th {
          background-color: #334155 !important;
          color: #fff !important;
          border-color: #475569 !important;
        }
        .print-doc-a4 .print-row-alt td {
          background-color: #f8fafc !important;
        }
        .print-doc-a4 tbody td {
          color: #1e293b !important;
          border-color: #e2e8f0 !important;
        }
        .print-doc-a4 .pdoc-party-label {
          color: #64748b !important;
        }
        .print-doc-a4 .pdoc-total-bold {
          color: #1e293b !important;
        }
        .print-doc-a4 .pdoc-total-muted {
          color: #64748b !important;
        }
        .print-doc-a4 .print-footer-note {
          color: #94a3b8 !important;
          border-color: #e2e8f0 !important;
        }
        .print-doc-a4 .pdoc-divider {
          border-color: #e2e8f0 !important;
        }
        .print-doc-a4 .pdoc-sig-line {
          border-color: #94a3b8 !important;
        }
        .print-doc-a4 .pdoc-sig-label {
          color: #64748b !important;
        }
        .print-doc-a4 .pdoc-status-badge {
          border-color: #334155 !important;
          color: #334155 !important;
        }

        @media screen {
          .print-paper-wrapper {
            background: #f1f5f9;
            padding: 24px;
            overflow: auto;
          }
          .print-doc-a4 {
            box-shadow: 0 4px 24px rgba(0,0,0,0.12);
            border-radius: 4px;
            overflow: hidden;
          }
        }

        /* ── Print: force B&W ── */
        @media print {
          .print-paper-wrapper {
            background: #fff !important;
            padding: 0 !important;
          }
          .print-doc-a4 {
            box-shadow: none !important;
            border-radius: 0 !important;
            padding: 10mm 12mm !important;
          }
          .print-doc-a4 .pdoc-header {
            background: #fff !important;
            border-bottom: 2px solid #000 !important;
          }
          .print-doc-a4 .pdoc-header * {
            color: #000 !important;
          }
          .print-doc-a4 .pdoc-header .pdoc-muted {
            color: #444 !important;
          }
          .print-doc-a4 thead th {
            background-color: #000 !important;
            color: #fff !important;
            border-color: #333 !important;
          }
          .print-doc-a4 .print-row-alt td {
            background-color: #f5f5f5 !important;
          }
          .print-doc-a4 tbody td {
            color: #000 !important;
            border-color: #ccc !important;
          }
          .print-doc-a4 .pdoc-party-label { color: #555 !important; }
          .print-doc-a4 .pdoc-total-bold { color: #000 !important; }
          .print-doc-a4 .pdoc-total-muted { color: #444 !important; }
          .print-doc-a4 .print-footer-note { color: #666 !important; }
          .print-doc-a4 .pdoc-divider { border-color: #ccc !important; }
          .print-doc-a4 .pdoc-status-badge { border-color: #000 !important; color: #000 !important; }
        }
      `}</style>
      <div className="print-paper-wrapper">
        {children}
      </div>
    </>
  );
}
