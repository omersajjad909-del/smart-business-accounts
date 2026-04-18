"use client";

import { useEffect, useState } from "react";
import { fmtDate } from "@/lib/dateUtils";
import { getCurrentUser } from "@/lib/auth";
import { exportToCSV } from "@/lib/export";

type TBRow = {
  code: string; name: string; category: string;
  opDebit: number; opCredit: number;
  transDebit: number; transCredit: number;
  clDebit: number; clCredit: number;
};

const fmt = (n: number, cur = "") =>
  `${cur ? cur + " " : ""}${Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function TrialBalancePage() {
  const today = new Date().toISOString().slice(0, 10);
  const [fromDate,    setFromDate]    = useState("2026-01-01");
  const [toDate,      setToDate]      = useState(today);
  const [rows,        setRows]        = useState<TBRow[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [companyInfo, setCompanyInfo] = useState<any>(null);

  useEffect(() => {
    const user = getCurrentUser();
    if (!user) return;
    fetch("/api/me/company", {
      headers: { "x-user-id": user.id || "", "x-user-role": user.role || "", "x-company-id": user.companyId || "" },
    }).then(r => r.ok ? r.json() : null).then(d => d && setCompanyInfo(d)).catch(() => {});
    loadReport();
  }, []);

  async function loadReport() {
    setLoading(true);
    try {
      const user = getCurrentUser();
      const res = await fetch(`/api/reports/trial-balance?from=${fromDate}&to=${toDate}`, {
        credentials: "include",
        headers: { "x-user-id": user?.id ?? "", "x-user-role": user?.role ?? "", "x-company-id": user?.companyId ?? "" },
      });
      const data = await res.json();
      setRows(data.rows || []);
    } finally {
      setLoading(false);
    }
  }

  const categories = Array.from(new Set(rows.map(r => r.category)));
  const cur = companyInfo?.baseCurrency || "";

  const grand = rows.reduce(
    (a, r) => ({
      opD: a.opD + (r.opDebit  || 0), opC: a.opC + (r.opCredit  || 0),
      trD: a.trD + (r.transDebit || 0), trC: a.trC + (r.transCredit || 0),
      clD: a.clD + (r.clDebit  || 0), clC: a.clC + (r.clCredit  || 0),
    }),
    { opD: 0, opC: 0, trD: 0, trC: 0, clD: 0, clC: 0 }
  );
  const difference = grand.clD - grand.clC;

  /* ── styles ── */
  const inputStyle: React.CSSProperties = {
    background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)",
    borderRadius: 8, color: "rgba(255,255,255,.85)", padding: "9px 12px",
    fontSize: 13, fontFamily: "inherit", outline: "none",
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,.35)",
    letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 6, display: "block",
  };
  const thStyle = (right = false): React.CSSProperties => ({
    padding: "10px 14px", fontSize: 10, fontWeight: 700,
    color: "rgba(255,255,255,.35)", letterSpacing: ".08em", textTransform: "uppercase",
    textAlign: right ? "right" : "left", whiteSpace: "nowrap",
    borderBottom: "1px solid rgba(255,255,255,.08)",
    borderRight: "1px solid rgba(255,255,255,.05)",
    background: "rgba(255,255,255,.04)",
  });
  const tdStyle = (right = false, bold = false): React.CSSProperties => ({
    padding: "9px 14px", fontSize: 12, textAlign: right ? "right" : "left",
    fontWeight: bold ? 700 : 400, whiteSpace: "nowrap",
    borderBottom: "1px solid rgba(255,255,255,.04)",
    borderRight: "1px solid rgba(255,255,255,.03)",
    color: "rgba(255,255,255,.65)",
  });

  return (
    <div style={{ fontFamily: "'Outfit','Inter',sans-serif", color: "rgba(255,255,255,.85)", maxWidth: 1200, margin: "0 auto" }}>

      {/* Page title */}
      <div style={{ marginBottom: 24, display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 4, height: 28, borderRadius: 2, background: "linear-gradient(180deg,#818cf8,#6366f1)" }}/>
        <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-.4px", margin: 0 }}>Trial Balance</h1>
      </div>

      {/* Filter bar */}
      <div style={{
        background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)",
        borderRadius: 14, padding: "20px 24px", marginBottom: 28,
        display: "flex", gap: 16, alignItems: "flex-end", flexWrap: "wrap",
      }} className="print:hidden">
        <div>
          <label style={labelStyle}>From</label>
          <input type="date" style={inputStyle} value={fromDate} onChange={e => setFromDate(e.target.value)}/>
        </div>
        <div>
          <label style={labelStyle}>To</label>
          <input type="date" style={inputStyle} value={toDate} onChange={e => setToDate(e.target.value)}/>
        </div>
        <button onClick={loadReport} style={{
          padding: "9px 28px", borderRadius: 8, border: "none", cursor: "pointer",
          background: "linear-gradient(135deg,#6366f1,#4f46e5)", color: "white",
          fontSize: 13, fontWeight: 700, fontFamily: "inherit",
        }}>Generate</button>
        <button onClick={() => window.print()} style={{
          padding: "9px 20px", borderRadius: 8, border: "1px solid rgba(99,102,241,.3)",
          cursor: "pointer", background: "rgba(99,102,241,.08)", color: "#818cf8",
          fontSize: 13, fontWeight: 700, fontFamily: "inherit",
        }}>🖨 Print</button>
        {rows.length > 0 && (
          <button onClick={() => exportToCSV(rows.map(r => ({
            Category: r.category, Code: r.code, Account: r.name,
            "Op Dr": r.opDebit, "Op Cr": r.opCredit,
            "Tr Dr": r.transDebit, "Tr Cr": r.transCredit,
            "Cl Dr": r.clDebit, "Cl Cr": r.clCredit,
          })), "trial-balance")} style={{
            padding: "9px 20px", borderRadius: 8, border: "1px solid rgba(52,211,153,.3)",
            cursor: "pointer", background: "rgba(52,211,153,.08)", color: "#34d399",
            fontSize: 13, fontWeight: 700, fontFamily: "inherit", whiteSpace: "nowrap",
          }}>↓ Export CSV</button>
        )}
      </div>

      {/* Report document */}
      <div style={{
        background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.08)",
        borderRadius: 16, overflow: "hidden",
      }}>

        {/* Header */}
        <div style={{
          padding: "32px 36px 28px",
          background: "linear-gradient(135deg,rgba(99,102,241,.12) 0%,rgba(79,70,229,.06) 100%)",
          borderBottom: "1px solid rgba(255,255,255,.08)",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: "-.5px", color: "white", lineHeight: 1 }}>
                {companyInfo?.name || "—"}
              </div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,.3)", letterSpacing: ".14em", textTransform: "uppercase", marginTop: 5 }}>
                {companyInfo?.country || "Global"} Operations
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#818cf8", letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 6 }}>
                Trial Balance
              </div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,.3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 3 }}>
                Reporting Period
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,.7)" }}>
                {fromDate} <span style={{ color: "rgba(255,255,255,.25)" }}>—</span> {toDate}
              </div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,.25)", marginTop: 8 }}>
                Generated: {fmtDate(new Date())}
              </div>
            </div>
          </div>

          {/* Column group labels */}
          {rows.length > 0 && (
            <div style={{
              marginTop: 24, paddingTop: 16,
              borderTop: "1px solid rgba(255,255,255,.07)",
              display: "flex", justifyContent: "flex-end", gap: 1,
            }}>
              {[
                { label: "Opening Balance", cols: 2, color: "rgba(129,140,248,.5)" },
                { label: "Period Transactions", cols: 2, color: "rgba(52,211,153,.4)" },
                { label: "Closing Balance", cols: 2, color: "rgba(251,191,36,.4)" },
              ].map(g => (
                <div key={g.label} style={{
                  width: g.cols * 120, textAlign: "center",
                  fontSize: 9, fontWeight: 700, color: g.color,
                  letterSpacing: ".1em", textTransform: "uppercase", paddingBottom: 6,
                  borderBottom: `2px solid ${g.color}`,
                }}>{g.label}</div>
              ))}
            </div>
          )}
        </div>

        {/* Body */}
        {loading ? (
          <div style={{ padding: "80px 0", textAlign: "center", color: "rgba(255,255,255,.25)", fontSize: 13 }}>
            Loading report…
          </div>
        ) : rows.length === 0 ? (
          <div style={{ padding: "80px 0", textAlign: "center", color: "rgba(255,255,255,.2)", fontSize: 13 }}>
            Click Generate to load the report
          </div>
        ) : (
          <>
            {categories.map((cat, ci) => {
              const list = rows.filter(r => r.category === cat);
              const sub = list.reduce(
                (a, r) => ({
                  opD: a.opD + (r.opDebit || 0), opC: a.opC + (r.opCredit || 0),
                  trD: a.trD + (r.transDebit || 0), trC: a.trC + (r.transCredit || 0),
                  clD: a.clD + (r.clDebit || 0), clC: a.clC + (r.clCredit || 0),
                }),
                { opD: 0, opC: 0, trD: 0, trC: 0, clD: 0, clC: 0 }
              );
              return (
                <div key={cat} style={{ borderBottom: ci < categories.length - 1 ? "1px solid rgba(255,255,255,.06)" : "none" }}>
                  {/* Category header */}
                  <div style={{
                    padding: "10px 20px", fontSize: 10, fontWeight: 800,
                    color: "#818cf8", letterSpacing: ".1em", textTransform: "uppercase",
                    background: "rgba(99,102,241,.06)", borderBottom: "1px solid rgba(255,255,255,.05)",
                  }}>{cat}</div>

                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                      <thead>
                        <tr>
                          <th style={thStyle()}>Code</th>
                          <th style={{ ...thStyle(), minWidth: 200 }}>Account Name</th>
                          <th style={thStyle(true)}>Op Dr</th>
                          <th style={thStyle(true)}>Op Cr</th>
                          <th style={{ ...thStyle(true), color: "rgba(52,211,153,.6)" }}>Tr Dr</th>
                          <th style={{ ...thStyle(true), color: "rgba(52,211,153,.6)" }}>Tr Cr</th>
                          <th style={{ ...thStyle(true), color: "rgba(251,191,36,.6)" }}>Cl Dr</th>
                          <th style={{ ...thStyle(true), color: "rgba(251,191,36,.6)", borderRight: "none" }}>Cl Cr</th>
                        </tr>
                      </thead>
                      <tbody>
                        {list.map((r, i) => (
                          <tr key={i}
                            style={{ background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,.012)" }}
                            onMouseEnter={e => (e.currentTarget.style.background = "rgba(99,102,241,.05)")}
                            onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 0 ? "transparent" : "rgba(255,255,255,.012)")}
                          >
                            <td style={{ ...tdStyle(), color: "#818cf8", fontWeight: 600, fontSize: 11 }}>{r.code}</td>
                            <td style={{ ...tdStyle(), color: "rgba(255,255,255,.8)", fontWeight: 600 }}>{r.name}</td>
                            <td style={tdStyle(true)}>{r.opDebit  ? fmt(r.opDebit)  : "—"}</td>
                            <td style={tdStyle(true)}>{r.opCredit ? fmt(r.opCredit) : "—"}</td>
                            <td style={{ ...tdStyle(true), color: r.transDebit  ? "#34d399" : "rgba(255,255,255,.2)" }}>{r.transDebit  ? fmt(r.transDebit)  : "—"}</td>
                            <td style={{ ...tdStyle(true), color: r.transCredit ? "#f87171" : "rgba(255,255,255,.2)" }}>{r.transCredit ? fmt(r.transCredit) : "—"}</td>
                            <td style={{ ...tdStyle(true, true), color: r.clDebit  ? "#fbbf24" : "rgba(255,255,255,.2)" }}>{r.clDebit  ? fmt(r.clDebit)  : "—"}</td>
                            <td style={{ ...tdStyle(true, true), color: r.clCredit ? "#fbbf24" : "rgba(255,255,255,.2)", borderRight: "none" }}>{r.clCredit ? fmt(r.clCredit) : "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                      {/* Category subtotal */}
                      <tfoot>
                        <tr style={{ background: "rgba(255,255,255,.03)", borderTop: "1px solid rgba(255,255,255,.07)" }}>
                          <td colSpan={2} style={{ ...tdStyle(), fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,.3)", letterSpacing: ".06em", textTransform: "uppercase" }}>
                            {cat} Subtotal
                          </td>
                          <td style={{ ...tdStyle(true, true), color: "rgba(255,255,255,.5)" }}>{fmt(sub.opD)}</td>
                          <td style={{ ...tdStyle(true, true), color: "rgba(255,255,255,.5)" }}>{fmt(sub.opC)}</td>
                          <td style={{ ...tdStyle(true, true), color: "#34d399" }}>{fmt(sub.trD)}</td>
                          <td style={{ ...tdStyle(true, true), color: "#f87171" }}>{fmt(sub.trC)}</td>
                          <td style={{ ...tdStyle(true, true), color: "#fbbf24" }}>{fmt(sub.clD)}</td>
                          <td style={{ ...tdStyle(true, true), color: "#fbbf24", borderRight: "none" }}>{fmt(sub.clC)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              );
            })}

            {/* Grand totals */}
            <div style={{
              padding: "20px 24px",
              background: "rgba(99,102,241,.08)",
              borderTop: "1px solid rgba(99,102,241,.2)",
              display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16,
            }}>
              <div style={{ display: "flex", gap: 32, flexWrap: "wrap" }}>
                {[
                  { label: "Total Op Dr", val: grand.opD, color: "rgba(255,255,255,.6)" },
                  { label: "Total Op Cr", val: grand.opC, color: "rgba(255,255,255,.6)" },
                  { label: "Total Tr Dr", val: grand.trD, color: "#34d399" },
                  { label: "Total Tr Cr", val: grand.trC, color: "#f87171" },
                  { label: "Total Cl Dr", val: grand.clD, color: "#fbbf24" },
                  { label: "Total Cl Cr", val: grand.clC, color: "#fbbf24" },
                ].map(col => (
                  <div key={col.label}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,.3)", letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 4 }}>{col.label}</div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: col.color }}>{fmt(col.val, cur)}</div>
                  </div>
                ))}
              </div>
              <div style={{
                background: difference === 0 ? "rgba(52,211,153,.1)" : "rgba(248,113,113,.1)",
                border: `1px solid ${difference === 0 ? "rgba(52,211,153,.3)" : "rgba(248,113,113,.3)"}`,
                borderRadius: 10, padding: "12px 20px", textAlign: "center",
              }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,.3)", letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 4 }}>
                  Difference
                </div>
                <div style={{ fontSize: 20, fontWeight: 900, color: difference === 0 ? "#34d399" : "#f87171" }}>
                  {difference === 0 ? "✓ Balanced" : fmt(Math.abs(difference), cur)}
                </div>
              </div>
            </div>

            {cur && (
              <div style={{ padding: "12px 24px", borderTop: "1px solid rgba(255,255,255,.05)", fontSize: 11, color: "rgba(255,255,255,.2)" }}>
                All amounts in {cur}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
