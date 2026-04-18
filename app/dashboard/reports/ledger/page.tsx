"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { fmtDate } from "@/lib/dateUtils";
import { getCurrentUser } from "@/lib/auth";
import { exportToCSV } from "@/lib/export";

type Account  = { id: string; name: string };
type LedgerRow = {
  date: string; voucherNo: string; narration: string;
  debit?: number; credit?: number; balance: number;
};

const fmt = (n: number, cur = "") =>
  `${cur ? cur + " " : ""}${Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const closeX: React.CSSProperties = { position:"absolute", top:14, right:16, background:"none", border:"none", color:"rgba(255,255,255,.35)", fontSize:20, cursor:"pointer", lineHeight:1, padding:4, borderRadius:6, fontFamily:"inherit" };

export default function LedgerReportPage() {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  const [accounts,    setAccounts]    = useState<Account[]>([]);
  const [accountId,   setAccountId]   = useState("");
  const [fromDate,    setFromDate]    = useState("2026-01-01");
  const [toDate,      setToDate]      = useState(today);
  const [rows,        setRows]        = useState<LedgerRow[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [companyInfo, setCompanyInfo] = useState<any>(null);
  const [showModal,   setShowModal]   = useState(true);
  const [search,      setSearch]      = useState("");
  const [dropOpen,    setDropOpen]    = useState(false);

  const fromRef    = useRef<HTMLInputElement>(null);
  const toRef      = useRef<HTMLInputElement>(null);
  const accountRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const user = getCurrentUser();
    if (!user) return;
    const h = { "x-user-id": user.id, "x-user-role": user.role, "x-company-id": user.companyId || "" };
    fetch("/api/accounts", { credentials: "include", headers: h })
      .then(r => r.json()).then(d => setAccounts(Array.isArray(d) ? d : []));
    fetch("/api/me/company", { headers: { "x-user-role": user?.role || "", "x-company-id": user?.companyId || "" } })
      .then(r => r.ok ? r.json() : null).then(d => d && setCompanyInfo(d)).catch(() => {});
  }, []);

  async function loadLedger(overrideId?: string) {
    const id = overrideId || accountId;
    if (!id) return;
    setLoading(true);
    setShowModal(false);
    try {
      const user = getCurrentUser();
      const res = await fetch(`/api/reports/ledger?accountId=${id}&from=${fromDate}&to=${toDate}`, {
        credentials: "include",
        headers: { "x-user-id": user?.id ?? "", "x-user-role": user?.role ?? "", "x-company-id": user?.companyId ?? "" },
      });
      const data = await res.json();
      setRows(Array.isArray(data) ? data : []);
    } finally { setLoading(false); }
  }

  const dataRows    = rows.slice(1);
  const totalDebit  = dataRows.reduce((s, r) => s + (r.debit  || 0), 0);
  const totalCredit = dataRows.reduce((s, r) => s + (r.credit || 0), 0);
  const finalBal    = rows.length ? rows[rows.length - 1].balance : 0;
  const openingBal  = rows.length ? rows[0].balance : null;
  const cur         = companyInfo?.baseCurrency || "";
  const acctName    = accounts.find(a => a.id === accountId)?.name || "";

  const filteredAccounts = accounts
    .filter(a => a.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

  const inputStyle: React.CSSProperties = {
    background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.12)",
    borderRadius: 8, color: "rgba(255,255,255,.85)", padding: "10px 14px",
    fontSize: 13, fontFamily: "inherit", outline: "none", width: "100%",
    boxSizing: "border-box",
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,.35)",
    letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 6, display: "block",
  };

  return (
    <div style={{ fontFamily: "'Outfit','Inter',sans-serif", color: "rgba(255,255,255,.85)" }}>

      {/* ── MODAL ── */}
      {showModal && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 50,
          background: "rgba(0,0,0,.7)", backdropFilter: "blur(6px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: 24,
        }}>
          <div style={{
            background: "linear-gradient(145deg,#0f1a35,#0b1225)",
            border: "1px solid rgba(99,102,241,.25)",
            borderRadius: 18, padding: "36px 40px", width: "100%", maxWidth: 480,
            boxShadow: "0 32px 80px rgba(0,0,0,.6)", position: "relative",
          }}>
            <button style={closeX} onClick={() => rows.length > 0 ? setShowModal(false) : router.back()}>✕</button>
            {/* Modal header */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <div style={{ width: 4, height: 24, borderRadius: 2, background: "linear-gradient(180deg,#818cf8,#6366f1)" }}/>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, letterSpacing: "-.3px" }}>
                  Account Ledger
                </h2>
              </div>
              <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,.3)", paddingLeft: 14 }}>
                Select date range and account to generate ledger
              </p>
            </div>

            {/* Date range — shown first */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 24 }}>
              <div>
                <label style={labelStyle}>From Date</label>
                <input
                  ref={fromRef}
                  type="date"
                  style={inputStyle}
                  value={fromDate}
                  onChange={e => setFromDate(e.target.value)}
                  autoFocus
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); toRef.current?.focus(); } }}
                />
              </div>
              <div>
                <label style={labelStyle}>To Date</label>
                <input
                  ref={toRef}
                  type="date"
                  style={inputStyle}
                  value={toDate}
                  onChange={e => setToDate(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      accountRef.current?.focus();
                      setDropOpen(true);
                    }
                  }}
                />
              </div>
            </div>

            {/* Autocomplete account selector */}
            <div style={{ marginBottom: 28, position: "relative" }}>
              <label style={labelStyle}>Account</label>
              <div style={{ position: "relative" }}>
                <input
                  ref={accountRef}
                  type="text"
                  placeholder="Type to search account..."
                  style={{ ...inputStyle, paddingRight: accountId ? 36 : 14 }}
                  value={accountId ? acctName : search}
                  onChange={e => { setSearch(e.target.value); setAccountId(""); setDropOpen(true); }}
                  onFocus={() => setDropOpen(true)}
                  onBlur={() => setTimeout(() => setDropOpen(false), 150)}
                  onKeyDown={e => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (accountId) { loadLedger(); return; }
                      if (filteredAccounts.length > 0) {
                        const first = filteredAccounts[0];
                        setAccountId(first.id); setSearch(""); setDropOpen(false);
                        loadLedger(first.id);
                      }
                    }
                  }}
                />
                {accountId && (
                  <button onClick={() => { setAccountId(""); setSearch(""); setDropOpen(false); }} style={{
                    position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                    background: "none", border: "none", color: "rgba(255,255,255,.4)",
                    cursor: "pointer", fontSize: 16, lineHeight: 1, padding: 2,
                  }}>×</button>
                )}
              </div>
              {/* Dropdown */}
              {dropOpen && !accountId && (
                <div style={{
                  position: "absolute", top: "100%", left: 0, right: 0, zIndex: 100,
                  background: "#0f1a35", border: "1px solid rgba(99,102,241,.3)",
                  borderRadius: 8, marginTop: 4, maxHeight: 220, overflowY: "auto",
                  boxShadow: "0 16px 40px rgba(0,0,0,.5)",
                }}>
                  {filteredAccounts.length === 0 ? (
                    <div style={{ padding: "14px", textAlign: "center", color: "rgba(255,255,255,.25)", fontSize: 12 }}>
                      No accounts found
                    </div>
                  ) : filteredAccounts.map(a => (
                    <div key={a.id} onMouseDown={() => { setAccountId(a.id); setSearch(""); setDropOpen(false); }} style={{
                      padding: "10px 14px", cursor: "pointer", fontSize: 13,
                      color: "rgba(255,255,255,.75)", borderBottom: "1px solid rgba(255,255,255,.04)",
                      transition: "background .1s",
                    }}
                      onMouseEnter={e => e.currentTarget.style.background = "rgba(99,102,241,.15)"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >{a.name}</div>
                  ))}
                </div>
              )}
              {accountId && (
                <div style={{ marginTop: 5, fontSize: 11, color: "#818cf8" }}>✓ {acctName}</div>
              )}
            </div>

            {/* Buttons */}
            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={loadLedger}
                disabled={!accountId}
                style={{
                  flex: 1, padding: "12px", borderRadius: 10, border: "none", cursor: accountId ? "pointer" : "not-allowed",
                  background: accountId ? "linear-gradient(135deg,#6366f1,#4f46e5)" : "rgba(255,255,255,.08)",
                  color: accountId ? "white" : "rgba(255,255,255,.3)",
                  fontSize: 14, fontWeight: 700, fontFamily: "inherit", transition: "all .15s",
                }}
              >
                Generate Ledger →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Report (shown after modal) ── */}
      {!showModal && (
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>

          {/* Top bar */}
          <div style={{ marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 4, height: 28, borderRadius: 2, background: "linear-gradient(180deg,#818cf8,#6366f1)" }}/>
              <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-.4px", margin: 0 }}>Ledger Report</h1>
            </div>
            <div style={{ display: "flex", gap: 10 }} className="print:hidden">
              <button onClick={() => { setShowModal(true); setRows([]); }} style={{
                padding: "8px 18px", borderRadius: 8, border: "1px solid rgba(255,255,255,.12)",
                cursor: "pointer", background: "rgba(255,255,255,.04)", color: "rgba(255,255,255,.6)",
                fontSize: 12, fontWeight: 600, fontFamily: "inherit",
              }}>⟵ Change Account</button>
              {rows.length > 0 && (
                <button onClick={() => exportToCSV(dataRows.map(r => ({
                  Date: r.date, "Voucher #": r.voucherNo, Narration: r.narration,
                  Debit: r.debit || 0, Credit: r.credit || 0, Balance: r.balance,
                })), "ledger-report")} style={{
                  padding: "8px 18px", borderRadius: 8, border: "1px solid rgba(52,211,153,.3)",
                  cursor: "pointer", background: "rgba(52,211,153,.08)", color: "#34d399",
                  fontSize: 12, fontWeight: 700, fontFamily: "inherit", whiteSpace: "nowrap",
                }}>↓ Export CSV</button>
              )}
              <button onClick={() => window.print()} style={{
                padding: "8px 18px", borderRadius: 8, border: "1px solid rgba(99,102,241,.3)",
                cursor: "pointer", background: "rgba(99,102,241,.08)", color: "#818cf8",
                fontSize: 12, fontWeight: 600, fontFamily: "inherit",
              }}>🖨 Print</button>
            </div>
          </div>

          {/* Report document */}
          <div style={{
            background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.08)",
            borderRadius: 16, overflow: "hidden",
          }}>
            {/* Compact header */}
            <div style={{
              padding: "14px 20px",
              background: "rgba(99,102,241,.08)",
              borderBottom: "1px solid rgba(255,255,255,.07)",
              display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8,
            }}>
              {/* Left: company + account */}
              <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: "white", letterSpacing: "-.2px" }}>
                  {companyInfo?.name || "—"}
                </div>
                <div style={{ width: 1, height: 16, background: "rgba(255,255,255,.1)" }}/>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#818cf8" }}>{acctName}</div>
                {openingBal !== null && rows.length > 0 && (
                  <>
                    <div style={{ width: 1, height: 16, background: "rgba(255,255,255,.1)" }}/>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,.35)" }}>
                      Opening: <span style={{ fontWeight: 700, color: openingBal >= 0 ? "#34d399" : "#f87171" }}>
                        {fmt(openingBal, cur)} {openingBal >= 0 ? "Dr" : "Cr"}
                      </span>
                    </div>
                  </>
                )}
              </div>
              {/* Right: period + date */}
              <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 11 }}>
                <div style={{ color: "rgba(255,255,255,.45)" }}>
                  <span style={{ color: "rgba(255,255,255,.25)", marginRight: 4 }}>Period:</span>
                  <span style={{ fontWeight: 700, color: "rgba(255,255,255,.7)" }}>{fromDate}</span>
                  <span style={{ color: "rgba(255,255,255,.2)", margin: "0 4px" }}>—</span>
                  <span style={{ fontWeight: 700, color: "rgba(255,255,255,.7)" }}>{toDate}</span>
                </div>
                <div style={{ color: "rgba(255,255,255,.2)" }}>Generated: {fmtDate(new Date())}</div>
              </div>
            </div>

            {/* Table */}
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "rgba(255,255,255,.05)", borderBottom: "1px solid rgba(255,255,255,.08)" }}>
                    {["Date","Voucher #","Narration / Particulars","Debit","Credit","Running Balance"].map((h, i) => (
                      <th key={h} style={{
                        padding: "11px 16px", fontSize: 10, fontWeight: 700,
                        color: "rgba(255,255,255,.35)", letterSpacing: ".08em", textTransform: "uppercase",
                        textAlign: i >= 3 ? "right" : "left", whiteSpace: "nowrap",
                        borderRight: i < 5 ? "1px solid rgba(255,255,255,.05)" : "none",
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={6} style={{ padding: "60px 0", textAlign: "center", color: "rgba(255,255,255,.25)", fontSize: 13 }}>
                      Loading transactions…
                    </td></tr>
                  ) : dataRows.length === 0 ? (
                    <tr><td colSpan={6} style={{ padding: "60px 0", textAlign: "center", color: "rgba(255,255,255,.2)", fontSize: 13 }}>
                      No transactions found for this period
                    </td></tr>
                  ) : dataRows.map((r, i) => (
                    <tr key={i} style={{
                      borderBottom: "1px solid rgba(255,255,255,.04)",
                      background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,.015)",
                      transition: "background .15s",
                    }}
                      onMouseEnter={e => (e.currentTarget.style.background = "rgba(99,102,241,.06)")}
                      onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 0 ? "transparent" : "rgba(255,255,255,.015)")}
                    >
                      <td style={{ padding: "11px 16px", color: "rgba(255,255,255,.45)", fontSize: 12, borderRight: "1px solid rgba(255,255,255,.04)", whiteSpace: "nowrap" }}>{r.date}</td>
                      <td style={{ padding: "11px 16px", color: "#818cf8", fontWeight: 600, fontSize: 12, borderRight: "1px solid rgba(255,255,255,.04)", whiteSpace: "nowrap" }}>{r.voucherNo}</td>
                      <td style={{ padding: "11px 16px", color: "rgba(255,255,255,.65)", borderRight: "1px solid rgba(255,255,255,.04)", maxWidth: 360 }}>{r.narration}</td>
                      <td style={{ padding: "11px 16px", textAlign: "right", fontWeight: 700, color: r.debit ? "#34d399" : "rgba(255,255,255,.18)", borderRight: "1px solid rgba(255,255,255,.04)", whiteSpace: "nowrap" }}>{r.debit ? fmt(r.debit) : "—"}</td>
                      <td style={{ padding: "11px 16px", textAlign: "right", fontWeight: 700, color: r.credit ? "#f87171" : "rgba(255,255,255,.18)", borderRight: "1px solid rgba(255,255,255,.04)", whiteSpace: "nowrap" }}>{r.credit ? fmt(r.credit) : "—"}</td>
                      <td style={{ padding: "11px 16px", textAlign: "right", fontWeight: 800, whiteSpace: "nowrap", color: r.balance >= 0 ? "#34d399" : "#f87171" }}>
                        {fmt(r.balance, cur)} <span style={{ fontSize: 10, opacity: .7 }}>{r.balance >= 0 ? "Dr" : "Cr"}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                {dataRows.length > 0 && (
                  <tfoot>
                    <tr style={{ borderTop: "1px solid rgba(255,255,255,.12)", background: "rgba(99,102,241,.06)" }}>
                      <td colSpan={3} style={{ padding: "12px 16px", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.35)", letterSpacing: ".06em", textTransform: "uppercase" }}>Period Totals</td>
                      <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: 800, color: "#34d399", fontSize: 14, whiteSpace: "nowrap" }}>{fmt(totalDebit, cur)}</td>
                      <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: 800, color: "#f87171", fontSize: 14, whiteSpace: "nowrap" }}>{fmt(totalCredit, cur)}</td>
                      <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: 900, fontSize: 15, color: finalBal >= 0 ? "#34d399" : "#f87171", whiteSpace: "nowrap" }}>
                        {fmt(finalBal, cur)} <span style={{ fontSize: 10, opacity: .7 }}>{finalBal >= 0 ? "Dr" : "Cr"}</span>
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
            {cur && (
              <div style={{ padding: "12px 24px", borderTop: "1px solid rgba(255,255,255,.05)", fontSize: 11, color: "rgba(255,255,255,.2)" }}>
                All amounts in {cur}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
