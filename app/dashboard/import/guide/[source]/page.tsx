"use client";
// FILE: app/dashboard/import/guide/[source]/page.tsx
//
// One system, end to end: what to do before you start, the ways out of it, the
// exact report for each of the nine files, how that system writes things, and
// what to do when the import complains.
//
// Written as one long page rather than a set of tabs, and printable, because
// the person who runs the export is usually not the person reading the screen —
// it is someone in the customer's IT department who wants a sheet of paper with
// eight report names on it. The Print button produces exactly that.

import Link from "next/link";
import { useMemo, useState } from "react";
import { useParams } from "next/navigation";

import { useResponsive } from "@/hooks/useResponsive";
import { IMPORT_SOURCES, IMPORT_DATA_TYPES, findDataType } from "@/lib/importEngine";
import { findSourceGuide } from "@/lib/importGuides";

const FONT = "'Outfit','Inter',sans-serif";
const MONO = "ui-monospace,'Cascadia Code','SF Mono',Consolas,monospace";

const card: React.CSSProperties = {
  background: "var(--panel-bg)",
  border: "1px solid var(--border)",
  borderRadius: 14,
};

function Section({ n, title, tint, children }: {
  n: string; title: string; tint?: string; children: React.ReactNode;
}) {
  return (
    <div style={{ ...card, padding: "20px 22px", marginBottom: 12, borderColor: tint ?? "var(--border)" }}>
      <div style={{ display: "flex", gap: 12, alignItems: "baseline", marginBottom: 13 }}>
        <span style={{
          fontSize: 12, fontWeight: 800, color: tint ? "#f59e0b" : "#818cf8",
          fontFamily: MONO, flexShrink: 0,
        }}>{n}</span>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{title}</h2>
      </div>
      {children}
    </div>
  );
}

export default function SourceGuidePage() {
  const { isMobile } = useResponsive();
  const params = useParams<{ source: string }>();
  const sourceId = String(params?.source ?? "");

  const guide = useMemo(() => findSourceGuide(sourceId), [sourceId]);
  const source = useMemo(() => IMPORT_SOURCES.find((s) => s.id === sourceId), [sourceId]);

  const [openSql, setOpenSql] = useState<string | null>(null);
  const [copied, setCopied] = useState("");

  async function copy(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(""), 1600);
    } catch {
      /* Clipboard is blocked in some embedded browsers; the SQL is selectable. */
    }
  }

  if (!guide || !source) {
    return (
      <div style={{
        minHeight: "100vh", background: "var(--app-bg)", color: "var(--text-primary)",
        padding: isMobile ? "15px 14px" : "28px 32px", fontFamily: FONT,
      }}>
        <div style={{ ...card, padding: "24px 26px", maxWidth: 560 }}>
          <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 8 }}>No guide for that system</div>
          <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.7, marginBottom: 18 }}>
            There is no import guide called &ldquo;{sourceId}&rdquo;. If your system is not on the
            list, use the generic guide — it covers any system that can produce a CSV, a spreadsheet,
            or a screen you can copy from.
          </div>
          <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
            <Link href="/dashboard/import/guide/csv" style={{
              padding: "10px 18px", borderRadius: 9, background: "#6366f1", color: "#fff",
              fontSize: 12.5, fontWeight: 700, textDecoration: "none",
            }}>Generic guide →</Link>
            <Link href="/dashboard/import/guide" style={{
              padding: "10px 18px", borderRadius: 9, fontSize: 12.5,
              border: "1px solid var(--border)", color: "var(--text-muted)", textDecoration: "none",
            }}>← All guides</Link>
          </div>
        </div>
      </div>
    );
  }

  // Import order, so the page reads the way the migration runs.
  const files = [...guide.extraction].sort(
    (a, b) => (findDataType(a.dataType)?.order ?? 99) - (findDataType(b.dataType)?.order ?? 99),
  );

  return (
    <div style={{
      minHeight: "100vh", background: "var(--app-bg)", color: "var(--text-primary)",
      padding: isMobile ? "15px 14px" : "28px 32px", fontFamily: FONT,
    }}>
      <style>{`@media print {
        .no-print { display: none !important; }
        body { background: #fff !important; color: #000 !important; }
      }`}</style>

      {/* ── Head ── */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "flex-start",
        gap: 12, flexWrap: "wrap", marginBottom: 22,
      }}>
        <div style={{ display: "flex", gap: 14, alignItems: "flex-start", maxWidth: 720 }}>
          <span style={{
            width: 42, height: 42, borderRadius: 11, flexShrink: 0, background: source.color,
            color: "#fff", fontSize: 14, fontWeight: 800,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>{source.badge}</span>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 6px", letterSpacing: -0.5 }}>
              Importing from {source.name}
            </h1>
            <p style={{ margin: "0 0 6px", fontSize: 13.5, color: "var(--text-muted)", lineHeight: 1.65 }}>
              {guide.summary}
            </p>
            <p style={{ margin: 0, fontSize: 11.5, color: "var(--text-muted)", opacity: 0.85 }}>
              {guide.versions}
            </p>
          </div>
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

      {/* ── 01 Before you start ── */}
      <Section n="01" title="Before you export anything">
        <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: "var(--text-muted)", lineHeight: 1.85 }}>
          {guide.before.map((line) => <li key={line}>{line}</li>)}
        </ul>
      </Section>

      {/* ── 02 Routes out ── */}
      <Section n="02" title="Ways to get the data out">
        <div style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : `repeat(${Math.min(guide.routes.length, 2)},1fr)`,
          gap: 10,
        }}>
          {guide.routes.map((route) => (
            <div key={route.title} style={{
              padding: "15px 16px", borderRadius: 11,
              border: "1px solid var(--border)", background: "var(--app-bg)",
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{route.title}</div>
              <div style={{ fontSize: 11.5, color: "#818cf8", marginBottom: 9, lineHeight: 1.5 }}>
                {route.who}
              </div>
              <ol style={{
                margin: 0, paddingLeft: 17, fontSize: 12,
                color: "var(--text-muted)", lineHeight: 1.75,
              }}>
                {route.steps.map((step) => <li key={step}>{step}</li>)}
              </ol>
            </div>
          ))}
        </div>
      </Section>

      {/* ── 03 File by file ── */}
      <div style={{ ...card, padding: "20px 22px", marginBottom: 12 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "baseline", marginBottom: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 800, color: "#818cf8", fontFamily: MONO }}>03</span>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
            The {files.length} files, in the order they go in
          </h2>
        </div>
        <div style={{ fontSize: 12.5, color: "var(--text-muted)", lineHeight: 1.7, marginBottom: 16 }}>
          Each one needs the ones above it. Preview all of them before you commit any of them — the
          preview costs nothing and it is the only place a mis-read column is cheap to fix.
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          {files.map((file) => {
            const def = findDataType(file.dataType);
            const key = `${guide.id}-${file.dataType}`;
            return (
              <div key={file.dataType} style={{
                border: "1px solid var(--border)", borderRadius: 11, overflow: "hidden",
              }}>
                <div style={{ padding: "14px 16px", background: "var(--app-bg)" }}>
                  <div style={{
                    display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap",
                    marginBottom: 9,
                  }}>
                    <div style={{ flex: 1, minWidth: 220 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 4 }}>
                        {def?.order}. {def?.icon} {def?.name}
                        {file.dataType === "ledger_history" && (
                          <span style={{
                            marginLeft: 8, padding: "2px 8px", borderRadius: 6, fontSize: 10,
                            fontWeight: 700, background: "rgba(148,163,184,.14)",
                            color: "var(--text-muted)", verticalAlign: "middle",
                          }}>OPTIONAL</span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6 }}>
                        <b style={{ color: "var(--text-primary)" }}>Where:</b> {file.where}
                      </div>
                    </div>
                    <div className="no-print" style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                      {file.sql && (
                        <button onClick={() => setOpenSql(openSql === key ? null : key)} style={{
                          padding: "7px 13px", borderRadius: 8, fontSize: 11.5, fontWeight: 600,
                          cursor: "pointer", border: "1px solid var(--border)", background: "transparent",
                          color: "var(--text-muted)", fontFamily: FONT, whiteSpace: "nowrap",
                        }}>{openSql === key ? "Hide SQL" : "Show SQL"}</button>
                      )}
                      <Link href={`/dashboard/import-wizard?dataType=${file.dataType}`} style={{
                        padding: "7px 13px", borderRadius: 8, fontSize: 11.5, fontWeight: 700,
                        background: "#6366f1", color: "#fff", textDecoration: "none", whiteSpace: "nowrap",
                      }}>Import →</Link>
                    </div>
                  </div>

                  {file.options && file.options.length > 0 && (
                    <div style={{ marginBottom: file.notes?.length ? 9 : 0 }}>
                      <div style={{
                        fontSize: 10.5, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase",
                        color: "var(--text-muted)", marginBottom: 5,
                      }}>Set these before exporting</div>
                      <ul style={{
                        margin: 0, paddingLeft: 18, fontSize: 12,
                        color: "var(--text-muted)", lineHeight: 1.7,
                      }}>
                        {file.options.map((o) => <li key={o}>{o}</li>)}
                      </ul>
                    </div>
                  )}

                  {file.notes && file.notes.length > 0 && (
                    <div style={{
                      padding: "10px 12px", borderRadius: 9,
                      background: "rgba(99,102,241,.07)", border: "1px solid rgba(99,102,241,.2)",
                    }}>
                      {file.notes.map((n) => (
                        <div key={n} style={{
                          fontSize: 11.5, color: "var(--text-muted)", lineHeight: 1.7,
                          display: "flex", gap: 8,
                        }}>
                          <span style={{ color: "#818cf8", flexShrink: 0 }}>›</span>
                          <span>{n}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {file.sql && openSql === key && (
                  <div style={{ borderTop: "1px solid var(--border)", position: "relative" }}>
                    <button
                      className="no-print"
                      onClick={() => copy(file.sql ?? "", key)}
                      style={{
                        position: "absolute", top: 9, right: 9, zIndex: 1,
                        padding: "5px 11px", borderRadius: 7, fontSize: 11, cursor: "pointer",
                        border: "1px solid var(--border)", background: "var(--panel-bg)",
                        color: copied === key ? "#22c55e" : "var(--text-muted)", fontFamily: FONT,
                      }}
                    >{copied === key ? "Copied" : "Copy"}</button>
                    <pre style={{
                      margin: 0, padding: "15px 16px", overflowX: "auto",
                      fontFamily: MONO, fontSize: 11.5, lineHeight: 1.65,
                      color: "var(--text-primary)", background: "transparent",
                    }}>{file.sql}</pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 04 Quirks ── */}
      <Section n="04" title={`How ${source.name} writes things`}>
        <div style={{ fontSize: 12.5, color: "var(--text-muted)", lineHeight: 1.7, marginBottom: 13 }}>
          All of this is already handled. It is listed so nobody spends an afternoon reformatting a
          file that did not need it.
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {guide.quirks.map((q) => (
            <div key={q.what} style={{ display: "flex", gap: 11, alignItems: "flex-start" }}>
              <span style={{ color: "#22c55e", fontWeight: 800, fontSize: 13, flexShrink: 0 }}>✓</span>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 2 }}>{q.what}</div>
                <div style={{ fontSize: 11.5, color: "var(--text-muted)", lineHeight: 1.7 }}>{q.why}</div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ── 05 Troubles ── */}
      <Section n="05" title="When something goes wrong" tint="rgba(245,158,11,.3)">
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {guide.troubles.map((t) => (
            <div key={t.symptom} style={{ display: "flex", gap: 11, alignItems: "flex-start" }}>
              <span style={{ color: "#f59e0b", fontWeight: 800, fontSize: 13, flexShrink: 0 }}>!</span>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 3 }}>{t.symptom}</div>
                <div style={{ fontSize: 11.5, color: "var(--text-muted)", lineHeight: 1.75 }}>{t.fix}</div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ── 06 Prove it ── */}
      <Section n="06" title="Prove the migration, then stop using the old system">
        <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.75, marginBottom: 13 }}>
          Run both systems side by side for a month, entering the same transactions in each. When
          these three reports match {source.name} exactly, the migration is finished and the old
          system goes read-only. It is never deleted — an auditor is entitled to the original.
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          {[
            { r: "Trial Balance", href: "/dashboard/reports/trial-balance", m: "Every account, to the rupee, on the cutover date. Out by one account's balance usually means a row was held back as a group total — the preview said which." },
            { r: "Stock Report", href: "/dashboard/reports/stock", m: "Quantity and value, against the old system's valuation and against the physical count." },
            { r: "Receivables Ageing", href: "/dashboard/reports/ageing", m: "Party by party, and bucket by bucket. The total must equal the receivables control account on the trial balance." },
          ].map((item) => (
            <div key={item.r} style={{ display: "flex", gap: 11, alignItems: "flex-start" }}>
              <span style={{ color: "#22c55e", fontWeight: 800, fontSize: 13, flexShrink: 0 }}>✓</span>
              <div style={{ fontSize: 12.5, lineHeight: 1.7 }}>
                <Link href={item.href} style={{ color: "#818cf8", fontWeight: 700 }}>{item.r}</Link>
                {" — "}<span style={{ color: "var(--text-muted)" }}>{item.m}</span>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <div className="no-print" style={{ display: "flex", gap: 10, marginTop: 6, flexWrap: "wrap" }}>
        <Link href="/dashboard/import-wizard" style={{
          padding: "12px 24px", borderRadius: 10, background: "#6366f1", color: "#fff",
          fontSize: 13.5, fontWeight: 700, textDecoration: "none",
        }}>Start importing →</Link>
        <Link href="/dashboard/import/guide/fields" style={{
          padding: "12px 20px", borderRadius: 10, fontSize: 13, textDecoration: "none",
          border: "1px solid var(--border)", color: "var(--text-muted)",
        }}>Column Reference</Link>
        <Link href="/dashboard/import/oracle-guide" style={{
          padding: "12px 20px", borderRadius: 10, fontSize: 13, textDecoration: "none",
          border: "1px solid var(--border)", color: "var(--text-muted)",
        }}>The cutover plan</Link>
      </div>

      {/* Keeps the data-type list honest if a guide ever falls behind the engine. */}
      {files.length < IMPORT_DATA_TYPES.length && (
        <div style={{
          ...card, marginTop: 12, padding: "13px 16px", fontSize: 11.5,
          color: "var(--text-muted)", lineHeight: 1.65,
        }}>
          This guide covers {files.length} of the {IMPORT_DATA_TYPES.length} import files. For the
          rest, use the{" "}
          <Link href="/dashboard/import/guide/csv" style={{ color: "#818cf8" }}>generic guide</Link>{" "}
          — any system that can produce a spreadsheet can produce them.
        </div>
      )}
    </div>
  );
}
