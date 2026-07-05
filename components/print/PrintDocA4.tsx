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
    <div
      className="print-doc-a4"
      style={{
        fontFamily: "Arial, 'Helvetica Neue', Helvetica, sans-serif",
        color: "#000",
        background: "#fff",
        width: "210mm",
        minHeight: "297mm",
        padding: "14mm 16mm 12mm",
        boxSizing: "border-box",
        margin: "0 auto",
      }}
    >
      {/* ── Letterhead ───────────────────────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "2px solid #000", paddingBottom: 10, marginBottom: 14 }}>
        <div>
          {showLogo && logoUrl ? (
            <img src={logoUrl} alt="logo" style={{ maxHeight: 48, maxWidth: 140, marginBottom: 6, objectFit: "contain" }} />
          ) : null}
          <div style={{ fontWeight: "bold", fontSize: 17, letterSpacing: 0.3 }}>{companyName}</div>
          {companyAddress && <div style={{ fontSize: 9.5, color: "#444", marginTop: 2 }}>{companyAddress}</div>}
          {companyPhone && <div style={{ fontSize: 9.5, color: "#444" }}>Tel: {companyPhone}</div>}
          {companyEmail && <div style={{ fontSize: 9.5, color: "#444" }}>{companyEmail}</div>}
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontWeight: "bold", fontSize: 20, letterSpacing: 1.5, textTransform: "uppercase" }}>{docTitle}</div>
          <div style={{ fontSize: 11, marginTop: 5 }}>
            <span style={{ color: "#555" }}>No: </span><strong>{docNo}</strong>
          </div>
          <div style={{ fontSize: 10.5, marginTop: 2 }}>
            <span style={{ color: "#555" }}>Date: </span>{date}
          </div>
          {dueDate && (
            <div style={{ fontSize: 10.5, marginTop: 2 }}>
              <span style={{ color: "#555" }}>Due: </span>{dueDate}
            </div>
          )}
          {status && (
            <div style={{
              display: "inline-block",
              border: "1px solid #000",
              padding: "1px 10px",
              borderRadius: 3,
              fontSize: 9.5,
              fontWeight: "bold",
              marginTop: 5,
              letterSpacing: 0.5,
            }}>
              {status.toUpperCase()}
            </div>
          )}
        </div>
      </div>

      {/* ── Party + Meta ─────────────────────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 9, fontWeight: "bold", textTransform: "uppercase", letterSpacing: 1, color: "#666", marginBottom: 3 }}>
            {partyLabel}
          </div>
          <div style={{ fontWeight: "bold", fontSize: 12.5 }}>{partyName}</div>
          {partyAddress && <div style={{ fontSize: 9.5, color: "#444", marginTop: 2 }}>{partyAddress}</div>}
          {partyPhone && <div style={{ fontSize: 9.5, color: "#444" }}>Tel: {partyPhone}</div>}
          {partyNtn && <div style={{ fontSize: 9.5, color: "#444" }}>NTN: {partyNtn}</div>}
        </div>

        {metaFields.length > 0 && (
          <div style={{ textAlign: "right", fontSize: 9.5, lineHeight: 1.8 }}>
            {metaFields.map((f, i) => (
              <div key={i}>
                <span style={{ color: "#555" }}>{f.label}: </span>
                <strong>{f.value}</strong>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Items Table ──────────────────────────────────────────── */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 12, fontSize: 9.5 }}>
        <thead>
          <tr>
            {columns.map((c, i) => (
              <th
                key={c.key}
                style={{
                  background: "#000",
                  color: "#fff",
                  padding: "6px 8px",
                  textAlign: (c.align || "left") as any,
                  fontWeight: "bold",
                  fontSize: 9,
                  letterSpacing: 0.4,
                  textTransform: "uppercase",
                  width: c.width,
                  borderRight: i < columns.length - 1 ? "1px solid #333" : undefined,
                }}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              style={{
                background: i % 2 === 1 ? "#f7f7f7" : "#fff",
                borderBottom: "1px solid #ddd",
              }}
            >
              {columns.map((c, ci) => (
                <td
                  key={c.key}
                  style={{
                    padding: "5px 8px",
                    textAlign: (c.align || "left") as any,
                    borderRight: ci < columns.length - 1 ? "1px solid #e0e0e0" : undefined,
                    verticalAlign: "middle",
                  }}
                >
                  {c.render ? c.render(row[c.key], row, i) : (row[c.key] ?? "")}
                </td>
              ))}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={columns.length} style={{ textAlign: "center", padding: 16, color: "#999", fontSize: 10 }}>
                No items
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* ── Totals ───────────────────────────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
        <table style={{ borderCollapse: "collapse", minWidth: 240 }}>
          <tbody>
            {totalsLines.map((line, i) => (
              <tr
                key={i}
                style={line.borderTop ? { borderTop: "2px solid #000" } : {}}
              >
                <td style={{
                  padding: "4px 14px 4px 0",
                  textAlign: "right",
                  fontSize: line.bold ? 12 : 10,
                  fontWeight: line.bold ? "bold" : "normal",
                  color: line.bold ? "#000" : "#444",
                  paddingTop: line.borderTop ? 8 : 4,
                }}>
                  {line.label}
                </td>
                <td style={{
                  padding: "4px 0",
                  textAlign: "right",
                  fontSize: line.bold ? 12 : 10,
                  fontWeight: line.bold ? "bold" : "normal",
                  minWidth: 90,
                  paddingTop: line.borderTop ? 8 : 4,
                }}>
                  {fmt(line.value)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Notes ────────────────────────────────────────────────── */}
      {notes && (
        <div style={{ borderTop: "1px solid #ddd", paddingTop: 8, marginBottom: 10 }}>
          <div style={{ fontSize: 9, fontWeight: "bold", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3, color: "#555" }}>Notes</div>
          <div style={{ fontSize: 9.5, color: "#333", whiteSpace: "pre-wrap" }}>{notes}</div>
        </div>
      )}

      {/* ── Terms ────────────────────────────────────────────────── */}
      {terms && (
        <div style={{ borderTop: "1px solid #ddd", paddingTop: 8, marginBottom: 10 }}>
          <div style={{ fontSize: 9, fontWeight: "bold", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3, color: "#555" }}>Terms & Conditions</div>
          <div style={{ fontSize: 9.5, color: "#333", whiteSpace: "pre-wrap" }}>{terms}</div>
        </div>
      )}

      {/* ── Signatures ───────────────────────────────────────────── */}
      {signatureLabels && signatureLabels.length > 0 && (
        <div style={{ display: "flex", justifyContent: "space-around", marginTop: 28, paddingTop: 12, borderTop: "1px solid #ddd" }}>
          {signatureLabels.map(lbl => (
            <div key={lbl} style={{ textAlign: "center" }}>
              <div style={{ borderTop: "1px solid #000", width: 130, margin: "0 auto 8px" }} />
              <div style={{ fontSize: 9.5, color: "#555" }}>{lbl}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Footer ───────────────────────────────────────────────── */}
      {footerNote && (
        <div style={{ textAlign: "center", borderTop: "1px solid #ddd", paddingTop: 8, marginTop: 14, fontSize: 8.5, color: "#777" }}>
          {footerNote}
        </div>
      )}
    </div>
  );
}

// ─── Print wrapper (adds paper shadow on screen, clean on print) ─────────────

export function PrintPaperWrapper({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`
        @media screen {
          .print-paper-wrapper {
            background: #e8e8e8;
            padding: 24px;
            overflow: auto;
          }
          .print-doc-a4 {
            box-shadow: 0 2px 20px rgba(0,0,0,0.18);
          }
        }
        @media print {
          .print-paper-wrapper {
            background: #fff !important;
            padding: 0 !important;
          }
          .print-doc-a4 {
            box-shadow: none !important;
            padding: 10mm 12mm !important;
          }
        }
      `}</style>
      <div className="print-paper-wrapper">
        {children}
      </div>
    </>
  );
}
