"use client";

import { useEffect, useState, useCallback } from "react";
import { getCurrentUser } from "@/lib/auth";

const ACCENT = "#6366f1";
const FONT = "'Outfit','Inter',sans-serif";

function fmt(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function colorVal(n: number, positive = "#34d399", negative = "#f87171") {
  return n >= 0 ? positive : negative;
}

export default function AnnualStatementsPage() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear.toString());
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadReport = useCallback(async (y: string) => {
    setLoading(true);
    setError("");
    try {
      const user = getCurrentUser();
      const res = await fetch(`/api/reports/annual-statements?year=${y}`, {
        credentials: "include",
        headers: {
          ...(user?.id   ? { "x-user-id":   user.id }   : {}),
          ...(user?.role ? { "x-user-role": user.role } : {}),
        },
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to load");
      setData(result);
    } catch (e: any) {
      setError(e.message || "Failed to load annual statements");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadReport(year); }, []);

  const handleLoad = () => loadReport(year);

  const handleExportCSV = () => {
    if (!data?.accounts) return;
    const headers = ["Code", "Account Name", "Type", "Opening Balance", "Net Transactions", "Closing Balance"];
    const rows = data.accounts.map((a: any) =>
      [a.code, a.name, a.type, a.openingBalance, a.transactions, a.closingBalance].join(",")
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `annual-statements-${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => window.print();

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--app-bg)",
        fontFamily: FONT,
        padding: "28px 24px",
        color: "var(--text-primary)",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0, letterSpacing: "-0.5px" }}>
            Annual Financial Statements
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--text-muted)" }}>
            Full-year summary of all accounts — balance sheet, P&L, and account ledgers
          </p>
        </div>

        {/* Controls */}
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            min="2015"
            max="2100"
            style={{
              padding: "8px 14px",
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "var(--panel-bg)",
              color: "var(--text-primary)",
              fontFamily: FONT,
              fontSize: 14,
              width: 100,
              outline: "none",
            }}
          />
          <button
            onClick={handleLoad}
            disabled={loading}
            style={btnStyle(ACCENT, loading)}
          >
            {loading ? "Loading..." : "Load Year"}
          </button>
          {data && (
            <>
              <button onClick={handleExportCSV} style={btnStyle("#059669")}>
                Export CSV
              </button>
              <button onClick={handlePrint} style={btnStyle("#7c3aed")}>
                Print PDF
              </button>
            </>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding: "14px 20px", borderRadius: 10, background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)", color: "#f87171", marginBottom: 20, fontSize: 14 }}>
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && !data && (
        <div style={{ textAlign: "center", padding: "80px 40px", color: "var(--text-muted)", fontSize: 14 }}>
          Loading annual statements for {year}...
        </div>
      )}

      {data && (
        <>
          {/* Summary cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginBottom: 24 }}>
            {/* Balance Sheet */}
            <div style={panelStyle}>
              <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1, color: "var(--text-muted)", marginBottom: 14 }}>
                Balance Sheet — {year}
              </div>
              {[
                { label: "Total Assets",      val: data.balanceSheet?.assets,       color: "#34d399" },
                { label: "Total Liabilities", val: data.balanceSheet?.liabilities,  color: "#f87171" },
                { label: "Equity",            val: data.balanceSheet?.equity,        color: ACCENT     },
              ].map(({ label, val, color }) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border)", fontSize: 14 }}>
                  <span style={{ color: "var(--text-muted)" }}>{label}</span>
                  <span style={{ fontWeight: 700, color }}>{fmt(val ?? 0)}</span>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0 0", fontSize: 15, fontWeight: 700 }}>
                <span>Net Total</span>
                <span style={{ color: ACCENT }}>{fmt(data.balanceSheet?.total ?? 0)}</span>
              </div>
            </div>

            {/* Profit & Loss */}
            <div style={panelStyle}>
              <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1, color: "var(--text-muted)", marginBottom: 14 }}>
                Profit & Loss — {year}
              </div>
              {[
                { label: "Total Income",   val: data.profitLoss?.income,    color: "#34d399" },
                { label: "Total Expenses", val: data.profitLoss?.expenses,  color: "#f87171" },
              ].map(({ label, val, color }) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border)", fontSize: 14 }}>
                  <span style={{ color: "var(--text-muted)" }}>{label}</span>
                  <span style={{ fontWeight: 700, color }}>{fmt(val ?? 0)}</span>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0 0", fontSize: 15, fontWeight: 700 }}>
                <span>{(data.profitLoss?.netProfit ?? 0) >= 0 ? "Net Profit" : "Net Loss"}</span>
                <span style={{ color: colorVal(data.profitLoss?.netProfit ?? 0) }}>
                  {fmt(Math.abs(data.profitLoss?.netProfit ?? 0))}
                </span>
              </div>
            </div>
          </div>

          {/* Account Details table */}
          <div style={{ ...panelStyle, padding: 0, overflow: "hidden" }} id="annual-printable">
            <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--border)", fontSize: 15, fontWeight: 700 }}>
              Account Ledger Summary
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "var(--app-bg)" }}>
                    {["Code", "Account Name", "Type", "Opening Balance", "Net Transactions", "Closing Balance"].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: "10px 16px",
                          textAlign: ["Opening Balance", "Net Transactions", "Closing Balance"].includes(h) ? "right" : "left",
                          color: "var(--text-muted)",
                          fontWeight: 600,
                          fontSize: 11,
                          textTransform: "uppercase",
                          letterSpacing: 0.5,
                          borderBottom: "1px solid var(--border)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(data.accounts ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: "40px 16px", textAlign: "center", color: "var(--text-muted)" }}>
                        No account data for {year}
                      </td>
                    </tr>
                  ) : (
                    (data.accounts ?? []).map((acc: any, i: number) => (
                      <tr
                        key={i}
                        style={{
                          borderBottom: "1px solid var(--border)",
                          background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)",
                        }}
                      >
                        <td style={{ padding: "11px 16px", color: "var(--text-muted)", fontFamily: "monospace" }}>{acc.code}</td>
                        <td style={{ padding: "11px 16px", fontWeight: 500 }}>{acc.name}</td>
                        <td style={{ padding: "11px 16px" }}>
                          <span style={{
                            padding: "2px 10px",
                            borderRadius: 20,
                            fontSize: 11,
                            fontWeight: 600,
                            background: "rgba(99,102,241,0.12)",
                            color: ACCENT,
                          }}>
                            {acc.type}
                          </span>
                        </td>
                        <td style={{ padding: "11px 16px", textAlign: "right", color: "var(--text-muted)" }}>
                          {fmt(acc.openingBalance ?? 0)}
                        </td>
                        <td style={{ padding: "11px 16px", textAlign: "right", color: (acc.transactions ?? 0) >= 0 ? "#34d399" : "#f87171" }}>
                          {fmt(acc.transactions ?? 0)}
                        </td>
                        <td style={{ padding: "11px 16px", textAlign: "right", fontWeight: 700, color: colorVal(acc.closingBalance ?? 0) }}>
                          {fmt(acc.closingBalance ?? 0)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #annual-printable, #annual-printable * { visibility: visible !important; }
          #annual-printable { position: fixed; inset: 0; padding: 32px; background: #fff; color: #111; }
        }
      `}</style>
    </div>
  );
}

const panelStyle: React.CSSProperties = {
  background: "var(--panel-bg)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: "20px 24px",
};

function btnStyle(bg: string, disabled = false): React.CSSProperties {
  return {
    padding: "8px 18px",
    borderRadius: 8,
    border: "none",
    background: disabled ? "rgba(99,102,241,0.3)" : bg,
    color: "#fff",
    fontFamily: "'Outfit','Inter',sans-serif",
    fontSize: 13,
    fontWeight: 600,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.7 : 1,
  };
}
