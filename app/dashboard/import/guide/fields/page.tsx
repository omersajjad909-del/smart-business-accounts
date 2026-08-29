"use client";
// FILE: app/dashboard/import/guide/fields/page.tsx
//
// Every column the importer looks for, per file: what it means, whether a row
// is refused without it, and every spelling of it that is accepted.
//
// The spellings are read out of FIELD_ALIASES at render time rather than
// written out again here. A reference page that is maintained separately from
// the thing it documents is wrong within a month, and this one would be wrong
// in the most expensive way: somebody renames a column to match the page, the
// import still ignores it, and they conclude the product cannot read their
// file. Generated from the engine, the page is either right or the engine is.

import Link from "next/link";
import { useMemo, useState } from "react";

import { useResponsive } from "@/hooks/useResponsive";
import {
  IMPORT_DATA_TYPES,
  FIELD_ALIASES,
  type ImportDataTypeDef,
} from "@/lib/importEngine";
import { FIELD_NOTES } from "@/lib/importGuides";

const FONT = "'Outfit','Inter',sans-serif";
const MONO = "ui-monospace,'Cascadia Code','SF Mono',Consolas,monospace";

const card: React.CSSProperties = {
  background: "var(--panel-bg)",
  border: "1px solid var(--border)",
  borderRadius: 14,
};

/**
 * Columns a file may carry beyond the ones our own template offers.
 *
 * The template is the shortest thing that works, not everything that is read —
 * a trial balance with a single signed Balance column imports perfectly and
 * "balance" is not in the opening-balance template. Left undocumented, the
 * operator reformats a file that would have worked as it was.
 */
const ALSO_READ: Partial<Record<string, string[]>> = {
  accounts: ["typeGroup", "balance", "debit", "credit", "phone", "email", "city", "address", "ntn", "strn"],
  customers: ["typeGroup", "balance", "debit", "credit", "description"],
  suppliers: ["typeGroup", "balance", "debit", "credit", "description", "creditLimit", "creditDays"],
  items: ["description", "gauge", "dimWidth", "dimLength", "shade", "phr", "stockValue"],
  opening_balances: ["balance"],
  opening_stock: ["stockValue", "unit"],
  open_invoices: ["party", "narration"],
  open_bills: ["party", "narration"],
  ledger_history: ["balance", "party"],
};

function Pill({ children, tone }: { children: React.ReactNode; tone?: "required" | "plain" }) {
  return (
    <span style={{
      padding: "3px 9px", borderRadius: 7, fontSize: 11, fontFamily: MONO,
      background: "rgba(255,255,255,.05)", border: "1px solid var(--border)",
      color: tone === "required" ? "#f59e0b" : "var(--text-muted)",
      display: "inline-block",
    }}>{children}</span>
  );
}

function FieldRow({ name, required, isMobile }: {
  name: string; required: boolean; isMobile: boolean;
}) {
  const aliases = FIELD_ALIASES[name] ?? [];
  const note = FIELD_NOTES[name];

  return (
    <tr style={{ borderBottom: "1px solid var(--border)", verticalAlign: "top" }}>
      <td style={{ padding: "11px 14px", whiteSpace: "nowrap" }}>
        <Pill tone={required ? "required" : "plain"}>{name}{required ? " *" : ""}</Pill>
      </td>
      <td style={{ padding: "11px 14px", fontSize: 12, color: "var(--text-muted)", lineHeight: 1.7, minWidth: isMobile ? 200 : 320 }}>
        {note ?? "Read into the row and kept as given."}
      </td>
      <td style={{ padding: "11px 14px", minWidth: isMobile ? 200 : 300 }}>
        {aliases.length > 0 ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
            {aliases.map((a) => (
              <span key={a} style={{
                padding: "2px 7px", borderRadius: 6, fontSize: 10.5, fontFamily: MONO,
                background: "var(--app-bg)", border: "1px solid var(--border)",
                color: "var(--text-muted)",
              }}>{a}</span>
            ))}
          </div>
        ) : (
          <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
            Matched on the name itself.
          </span>
        )}
      </td>
    </tr>
  );
}

function TypeBlock({ def, isMobile }: { def: ImportDataTypeDef; isMobile: boolean }) {
  // Template columns first, in template order, then anything else that is read
  // but was not worth putting in a starter file.
  const extras = (ALSO_READ[def.id] ?? []).filter((f) => !def.template.includes(f));
  const fields = [...def.template, ...extras];

  return (
    <div style={{ ...card, padding: 0, overflow: "hidden", marginBottom: 12 }}>
      <div style={{ padding: "16px 18px", borderBottom: "1px solid var(--border)" }}>
        <div style={{
          display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 5,
        }}>
          <span style={{
            width: 24, height: 24, borderRadius: 7, fontSize: 10.5, fontWeight: 800,
            background: "rgba(255,255,255,.05)", border: "1px solid var(--border)",
            color: "var(--text-muted)",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>{def.order}</span>
          <h2 style={{ margin: 0, fontSize: 15.5, fontWeight: 700 }}>{def.icon} {def.name}</h2>
          <div className="no-print" style={{ marginLeft: "auto", display: "flex", gap: 7 }}>
            <a href={`/api/import/template?dataType=${def.id}`} style={{
              padding: "6px 12px", borderRadius: 8, fontSize: 11.5, textDecoration: "none",
              border: "1px solid var(--border)", color: "var(--text-muted)", whiteSpace: "nowrap",
            }}>⬇ Template</a>
            <Link href={`/dashboard/import-wizard?dataType=${def.id}`} style={{
              padding: "6px 12px", borderRadius: 8, fontSize: 11.5, fontWeight: 700,
              background: "#6366f1", color: "#fff", textDecoration: "none", whiteSpace: "nowrap",
            }}>Import →</Link>
          </div>
        </div>
        <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.65 }}>
          {def.desc}. {def.why}
          {def.required.length === 0 && (
            <> No single column is required — a row is kept if it carries enough to be matched to
              an account or item.</>
          )}
        </div>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr>
              {["Column", "What it is for", "Headings accepted for it"].map((h) => (
                <th key={h} style={{
                  padding: "9px 14px", textAlign: "left", fontSize: 10.5, fontWeight: 700,
                  color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.6,
                  borderBottom: "1px solid var(--border)", whiteSpace: "nowrap",
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {fields.map((f) => (
              <FieldRow
                key={f}
                name={f}
                required={def.required.includes(f)}
                isMobile={isMobile}
              />
            ))}
          </tbody>
        </table>
      </div>

      {extras.length > 0 && (
        <div style={{
          padding: "11px 18px", borderTop: "1px solid var(--border)",
          fontSize: 11.5, color: "var(--text-muted)", lineHeight: 1.65,
        }}>
          The last {extras.length} {extras.length === 1 ? "column is" : "columns are"} read but not
          in the template — they exist because real exports carry them.
        </div>
      )}
    </div>
  );
}

export default function ColumnReferencePage() {
  const { isMobile } = useResponsive();
  const [query, setQuery] = useState("");

  const ordered = useMemo(
    () => [...IMPORT_DATA_TYPES].sort((a, b) => a.order - b.order),
    [],
  );

  // Searching by the heading in the operator's own file is the way this page is
  // actually used: "my column says PRIMARY_UOM_CODE — is that read?"
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/[\s_\-./\\]+/g, "");
    if (!q) return null;
    return Object.entries(FIELD_ALIASES)
      .map(([field, aliases]) => ({
        field,
        hits: aliases.filter((a) => a.replace(/[\s_\-./\\]+/g, "").includes(q)),
      }))
      .filter((r) => r.hits.length > 0 || r.field.toLowerCase().includes(q));
  }, [query]);

  return (
    <div style={{
      minHeight: "100vh", background: "var(--app-bg)", color: "var(--text-primary)",
      padding: isMobile ? "15px 14px" : "28px 32px", fontFamily: FONT,
    }}>
      <style>{`@media print {
        .no-print { display: none !important; }
        body { background: #fff !important; color: #000 !important; }
      }`}</style>

      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "flex-start",
        gap: 12, flexWrap: "wrap", marginBottom: 20,
      }}>
        <div style={{ maxWidth: 720 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 6px", letterSpacing: -0.5 }}>
            Column Reference
          </h1>
          <p style={{ margin: 0, fontSize: 13.5, color: "var(--text-muted)", lineHeight: 1.65 }}>
            Every column read from an import file, and every heading accepted for it. Read straight
            out of the importer, so it says what the importer actually does.
          </p>
        </div>
        <div className="no-print" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={() => window.print()} style={{
            padding: "9px 16px", borderRadius: 9, fontSize: 12.5, fontWeight: 600, cursor: "pointer",
            border: "1px solid var(--border)", background: "transparent",
            color: "var(--text-muted)", fontFamily: FONT,
          }}>🖨️ Print / PDF</button>
          <Link href="/dashboard/import/guide" style={{
            padding: "9px 16px", borderRadius: 9, fontSize: 12.5, fontWeight: 600,
            border: "1px solid var(--border)", color: "var(--text-muted)", textDecoration: "none",
          }}>← All guides</Link>
        </div>
      </div>

      {/* ── How matching works ── */}
      <div style={{
        ...card, borderColor: "rgba(99,102,241,.3)", background: "rgba(99,102,241,.08)",
        padding: "17px 20px", marginBottom: 16, fontSize: 12.5,
        color: "var(--text-muted)", lineHeight: 1.8,
      }}>
        <b style={{ color: "var(--text-primary)" }}>Nothing here needs renaming.</b> Headings are
        matched loosely: case, spaces, underscores, dots, dashes and slashes are all ignored, so{" "}
        <code style={{ fontFamily: MONO }}>ACCOUNT_NAME</code>,{" "}
        <code style={{ fontFamily: MONO }}>Account Name</code> and{" "}
        <code style={{ fontFamily: MONO }}>A/C Name</code> are the same heading. A heading that is
        not an exact match is then tried by whole word, which is what catches Oracle&rsquo;s
        decorated columns —{" "}
        <code style={{ fontFamily: MONO }}>PRIMARY_PHONE_NUMBER</code>,{" "}
        <code style={{ fontFamily: MONO }}>AMOUNT_DUE_REMAINING</code>. Columns nobody recognises are
        ignored, so an export with sixty columns is no harder to import than one with six.
        <br />
        <span style={{ color: "#f59e0b", fontWeight: 700 }}>*</span> marks a column a row is refused
        without.
      </div>

      {/* ── Search ── */}
      <div className="no-print" style={{ ...card, padding: "16px 18px", marginBottom: 16 }}>
        <label style={{
          display: "block", fontSize: 12, fontWeight: 700, marginBottom: 7,
        }}>Is my column read? Type the heading exactly as it appears in your file</label>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="PRIMARY_UOM_CODE"
          spellCheck={false}
          style={{
            width: "100%", maxWidth: 420, boxSizing: "border-box", padding: "10px 13px",
            borderRadius: 9, background: "var(--app-bg)", border: "1px solid var(--border)",
            color: "var(--text-primary)", fontSize: 13, fontFamily: MONO, outline: "none",
          }}
        />
        {matches && (
          <div style={{ marginTop: 13 }}>
            {matches.length === 0 ? (
              <div style={{ fontSize: 12.5, color: "#f59e0b", lineHeight: 1.7 }}>
                No column is read under that heading. Rename it in your file to the plain word from
                the tables below — that is a thirty-second fix, and the import will then find it.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {matches.map((m) => (
                  <div key={m.field} style={{ fontSize: 12.5, lineHeight: 1.7 }}>
                    <span style={{ color: "#22c55e", fontWeight: 800 }}>✓</span>{" "}
                    Read as <Pill>{m.field}</Pill>
                    <span style={{ color: "var(--text-muted)" }}>
                      {" "}— {FIELD_NOTES[m.field] ?? "read into the row as given."}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {ordered.map((def) => (
        <TypeBlock key={def.id} def={def} isMobile={isMobile} />
      ))}

      <div className="no-print" style={{ display: "flex", gap: 10, marginTop: 6, flexWrap: "wrap" }}>
        <Link href="/dashboard/import-wizard" style={{
          padding: "12px 24px", borderRadius: 10, background: "#6366f1", color: "#fff",
          fontSize: 13.5, fontWeight: 700, textDecoration: "none",
        }}>Start importing →</Link>
        <Link href="/dashboard/import/guide" style={{
          padding: "12px 20px", borderRadius: 10, fontSize: 13, textDecoration: "none",
          border: "1px solid var(--border)", color: "var(--text-muted)",
        }}>← All guides</Link>
      </div>
    </div>
  );
}
