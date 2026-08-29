"use client";
// FILE: app/dashboard/import/guide/page.tsx
//
// The front door to the migration documentation: pick the system you are
// leaving, or look up what a column means.
//
// Separate from the Import Center on purpose. The Import Center answers "what
// have I done so far" and is read during the migration; this answers "how do I
// get the file at all" and is read before it — usually by a different person,
// often before anyone has signed anything. Putting both on one screen made the
// Import Center a wall of instructions on every visit, including the fifth one.

import Link from "next/link";
import { useResponsive } from "@/hooks/useResponsive";
import { IMPORT_SOURCES, IMPORT_DATA_TYPES } from "@/lib/importEngine";
import { SOURCE_GUIDES } from "@/lib/importGuides";

const FONT = "'Outfit','Inter',sans-serif";
const MONO = "ui-monospace,'Cascadia Code','SF Mono',Consolas,monospace";

const card: React.CSSProperties = {
  background: "var(--panel-bg)",
  border: "1px solid var(--border)",
  borderRadius: 14,
};

export default function ImportGuideHubPage() {
  const { isMobile } = useResponsive();
  const ordered = [...IMPORT_DATA_TYPES].sort((a, b) => a.order - b.order);

  return (
    <div style={{
      minHeight: "100vh", background: "var(--app-bg)", color: "var(--text-primary)",
      padding: isMobile ? "15px 14px" : "28px 32px", fontFamily: FONT,
    }}>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "flex-start",
        gap: 12, flexWrap: "wrap", marginBottom: 22,
      }}>
        <div style={{ maxWidth: 700 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 6px", letterSpacing: -0.5 }}>
            Import Guides
          </h1>
          <p style={{ margin: 0, fontSize: 13.5, color: "var(--text-muted)", lineHeight: 1.65 }}>
            The exact screen, report and options to use in the system you are leaving — file by
            file, for every system this product imports from.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link href="/dashboard/import/oracle-guide" style={{
            padding: "9px 16px", borderRadius: 9, fontSize: 12.5, fontWeight: 600,
            border: "1px solid var(--border)", color: "var(--text-muted)", textDecoration: "none",
          }}>The cutover plan</Link>
          <Link href="/dashboard/import" style={{
            padding: "9px 16px", borderRadius: 9, fontSize: 12.5, fontWeight: 600,
            border: "1px solid var(--border)", color: "var(--text-muted)", textDecoration: "none",
          }}>← Import Center</Link>
        </div>
      </div>

      {/* ── Read this first ── */}
      <div style={{
        ...card, borderColor: "rgba(99,102,241,.3)", background: "rgba(99,102,241,.08)",
        padding: "18px 22px", marginBottom: 18,
      }}>
        <div style={{ fontSize: 14.5, fontWeight: 700, marginBottom: 8 }}>
          Three things that are true whichever system you are on
        </div>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3,1fr)", gap: 10 }}>
          {[
            {
              t: "You import a position, not a history",
              d: "The trial balance on a cutover date, the parties, the items, the stock, and the bills still unpaid. Old transactions stay in the old system, which stays readable. This is how every accounting migration is done.",
            },
            {
              t: "The order is not a preference",
              d: "An opening balance cannot attach to an account nobody has imported yet. The nine files below go in the order they are numbered, and the Import Center tracks where you got to.",
            },
            {
              t: "Nothing is written until you have looked",
              d: "Every file is read, mapped and shown back to you first — which column became what, and which existing account each row matched. Import writes only what you have already seen.",
            },
          ].map((item) => (
            <div key={item.t} style={{
              padding: "13px 15px", borderRadius: 10,
              background: "var(--app-bg)", border: "1px solid var(--border)",
            }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 5 }}>{item.t}</div>
              <div style={{ fontSize: 11.5, color: "var(--text-muted)", lineHeight: 1.65 }}>{item.d}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Per system ── */}
      <div style={{ ...card, padding: isMobile ? "18px 15px" : "22px 24px", marginBottom: 14 }}>
        <h2 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 700 }}>
          Pick the system you are leaving
        </h2>
        <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginBottom: 16, lineHeight: 1.6 }}>
          Each guide names the exact report for all nine files, the options that have to be set
          before exporting it, and what goes wrong with that particular system.
        </div>
        <div style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill,minmax(260px,1fr))",
          gap: 10,
        }}>
          {IMPORT_SOURCES.map((source) => {
            const guide = SOURCE_GUIDES.find((g) => g.id === source.id);
            return (
              <Link key={source.id} href={`/dashboard/import/guide/${source.id}`} style={{
                display: "flex", gap: 12, alignItems: "flex-start", textDecoration: "none",
                padding: "15px 16px", borderRadius: 12,
                border: "1px solid var(--border)", color: "var(--text-primary)",
              }}>
                <span style={{
                  width: 34, height: 34, borderRadius: 9, flexShrink: 0, background: source.color,
                  color: "#fff", fontSize: 12, fontWeight: 800,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>{source.badge}</span>
                <span style={{ flex: 1 }}>
                  <span style={{ display: "block", fontSize: 13.5, fontWeight: 700, marginBottom: 3 }}>
                    {source.name}
                  </span>
                  <span style={{
                    display: "block", fontSize: 11.5, color: "var(--text-muted)", lineHeight: 1.55,
                  }}>{guide?.summary ?? source.desc}</span>
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* ── Per file ── */}
      <div style={{ ...card, padding: isMobile ? "18px 15px" : "22px 24px", marginBottom: 14 }}>
        <h2 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 700 }}>The nine files, in order</h2>
        <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginBottom: 16, lineHeight: 1.6 }}>
          Each one needs the ones above it. The last is optional — everything you need to trade from
          day one is in the first eight.
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {ordered.map((type) => (
            <div key={type.id} style={{
              display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap",
              padding: "13px 15px", borderRadius: 11, border: "1px solid var(--border)",
            }}>
              <span style={{
                width: 26, height: 26, borderRadius: 8, flexShrink: 0, fontSize: 11, fontWeight: 800,
                background: "rgba(255,255,255,.05)", border: "1px solid var(--border)",
                color: "var(--text-muted)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>{type.order}</span>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 2 }}>
                  {type.icon} {type.name}
                </div>
                <div style={{ fontSize: 11.5, color: "var(--text-muted)", lineHeight: 1.55 }}>
                  {type.why}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <a href={`/api/import/template?dataType=${type.id}`} style={{
                  padding: "7px 12px", borderRadius: 8, fontSize: 11.5, textDecoration: "none",
                  border: "1px solid var(--border)", color: "var(--text-muted)", whiteSpace: "nowrap",
                }}>⬇ Template</a>
                <Link href={`/dashboard/import-wizard?dataType=${type.id}`} style={{
                  padding: "7px 12px", borderRadius: 8, fontSize: 11.5, fontWeight: 700,
                  background: "#6366f1", color: "#fff", textDecoration: "none", whiteSpace: "nowrap",
                }}>Import →</Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Reference ── */}
      <div style={{
        ...card, padding: isMobile ? "18px 15px" : "22px 24px",
        display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap",
      }}>
        <div style={{ flex: 1, minWidth: 240 }}>
          <h2 style={{ margin: "0 0 5px", fontSize: 16, fontWeight: 700 }}>Column Reference</h2>
          <div style={{ fontSize: 12.5, color: "var(--text-muted)", lineHeight: 1.65 }}>
            Every column the importer looks for, what it is used for, and every spelling of it that
            is accepted — read straight from the importer itself, so it cannot fall out of date.
            Nothing needs renaming: <code style={{ fontFamily: MONO }}>ACCOUNT_NAME</code>,{" "}
            <code style={{ fontFamily: MONO }}>Account Name</code> and{" "}
            <code style={{ fontFamily: MONO }}>Ledger Name</code> already resolve to the same column.
          </div>
        </div>
        <Link href="/dashboard/import/guide/fields" style={{
          padding: "11px 20px", borderRadius: 10, background: "#6366f1", color: "#fff",
          fontSize: 13, fontWeight: 700, textDecoration: "none", whiteSpace: "nowrap",
        }}>Open the reference →</Link>
      </div>
    </div>
  );
}
