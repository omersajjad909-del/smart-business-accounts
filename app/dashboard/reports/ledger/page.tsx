"use client";

import { useEffect, useState } from "react";
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

export default function LedgerReportPage() {
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

  useEffect(() => {
    const user = getCurrentUser();
    if (!user) return;
    const h = { "x-user-id": user.id, "x-user-role": user.role, "x-company-id": user.companyId || "" };
    fetch("/api/accounts", { credentials: "include", headers: h })
      .then(r => r.json()).then(d => setAccounts(Array.isArray(d) ? d : []));
    fetch("/api/me/company", { headers: { "x-user-role": user?.role || "", "x-company-id": user?.companyId || "" } })
      .then(r => r.ok ? r.json() : null).then(d => d && setCompanyInfo(d)).catch(() => {});
  }, []);

  async function loadLedger() {
    if (!accountId) return;
    setLoading(true);
    setShowModal(false);
    try {
      const user = getCurrentUser();
      const res = await fetch(`/api/reports/ledger?accountId=${accountId}&from=${fromDate}&to=${toDate}`, {
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

  const filteredAccounts = accounts.filter(a =>
    a.name.toLowerCase().includes(search.toLowerCase())
  );

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
            boxShadow: "0 32px 80px rgba(0,0,0,.6)",
          }}>
            {/* Modal header */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <div style={{ width: 4, height: 24, borderRadius: 2, background: "linear-gradient(180deg,#818cf8,#6366f1)" }}/>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, letterSpacing: "-.3px" }}>
                  Account Ledger
                </h2>
              </div>
              <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,.3)", paddingLeft: 14 }}>
                Select account and date range to generate ledger
              </p>
            </div>

            {/* Account search */}
            <div style={{ marginBottom: 18 }}>
              <label style={labelStyle}>Search Account</label>
              <input
                type="text"
                placeholder="Type account name..."
                style={inputStyle}
                value={search}
                onChange={e => setSearch(e.target.value)}
                autoFocus
              />
            </div>

            {/* Account list */}
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Select Account</label>
              <div style={{
                background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.08)",
                borderRadius: 8, maxHeight: 180, overflowY: "auto",
              }}>
                {filteredAccounts.length === 0 ? (
                  <div style={{ padding: "20px", textAlign: "center", color: "rgba(255,255,255,.2)", fontSize: 12 }}>
                    No accounts found
                  </div>
                ) : filteredAccounts.map(a => (
                  <div
                    key={a.id}
                    onClick={() => setAccountId(a.id)}
                    style={{
                      padding: "10px 14px", cursor: "pointer", fontSize: 13,
                      background: accountId === a.id ? "rgba(99,102,241,.2)" : "transparent",
                      color: accountId === a.id ? "#a5b4fc" : "rgba(255,255,255,.65)",
                      fontWeight: accountId === a.id ? 700 : 400,
                      borderBottom: "1px solid rgba(255,255,255,.04)",
                      display: "flex", alignItems: "center", gap: 8, transition: "background .1s",
                    }}
                    onMouseEnter={e => { if (accountId !== a.id) e.currentTarget.style.background = "rgba(255,255,255,.04)"; }}
                    onMouseLeave={e => { if (accountId !== a.id) e.currentTarget.style.background = "transparent"; }}
                  >
                    {accountId === a.id && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    )}
                    {a.name}
                  </div>
                ))}
              </div>
              {accountId && (
                <div style={{ marginTop: 6, fontSize: 11, color: "#818cf8", paddingLeft: 4 }}>
                  ✓ Selected: {acctName}
                </div>
              )}
            </div>

            {/* Date range */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 28 }}>
              <div>
                <label style={labelStyle}>From Date</label>
                <input type="date" style={inputStyle} value={fromDate} onChange={e => setFromDate(e.target.value)}/>
              </div>
              <div>
                <label style={labelStyle}>To Date</label>
                <input type="date" style={inputStyle} value={toDate} onChange={e => setToDate(e.target.value)}/>
              </div>
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
          <div style={{ marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
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
                    Account Ledger
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

              <div style={{
                marginTop: 28, paddingTop: 20,
                borderTop: "1px solid rgba(255,255,255,.07)",
                display: "flex", justifyContent: "space-between", alignItems: "flex-end",
              }}>
                <div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,.3)", fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 6 }}>
                    Statement for
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "white", letterSpacing: "-.3px" }}>
                    {acctName}
                  </div>
                </div>
                {openingBal !== null && rows.length > 0 && (
                  <div style={{
                    background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)",
                    borderRadius: 10, padding: "10px 20px", textAlign: "right",
                  }}>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,.3)", fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 3 }}>
                      Opening Balance
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: openingBal >= 0 ? "#34d399" : "#f87171" }}>
                      {fmt(openingBal, cur)} {openingBal >= 0 ? "Dr" : "Cr"}
                    </div>
                  </div>
                )}
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
