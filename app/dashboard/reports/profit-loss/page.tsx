"use client";

import toast from "react-hot-toast";
import { useEffect, useState, useCallback } from "react";
import { getCurrentUser } from "@/lib/auth";

interface PLItem {
  name: string;
  amount: number;
}

interface PLReport {
  income: PLItem[];
  expense: PLItem[];
  totalIncome: number;
  totalExpense: number;
  grossProfit: number;
  netProfit: number;
}

function fmt(n: number | undefined | null) {
  if (n === undefined || n === null) return "—";
  return Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getHeaders(): Record<string, string> {
  const user = getCurrentUser();
  if (!user) return {};
  return {
    "x-user-id": user.id,
    "x-user-role": user.role ?? "",
    "x-company-id": user.companyId ?? "",
  };
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function firstOfYear() {
  return `${new Date().getFullYear()}-01-01`;
}

export default function ProfitLossPage() {
  const [from, setFrom] = useState(firstOfYear());
  const [to, setTo] = useState(todayStr());
  const [report, setReport] = useState<PLReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sendingEmail, setSendingEmail] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/reports/profit-loss?from=${from}&to=${to}`,
        { headers: getHeaders(), credentials: "include" }
      );
      const d = await res.json();
      if (!res.ok) {
        setError(d.error || "Failed to load report");
        return;
      }
      setReport(d);
    } catch {
      setError("Network error — could not load report");
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const sendEmail = async () => {
    const email = window.prompt("Enter email address to send the report:");
    if (!email || !email.includes("@")) return;
    setSendingEmail(true);
    try {
      const user = getCurrentUser();
      const res = await fetch("/api/email/send", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "x-user-role": user?.role ?? "",
          "x-user-id": user?.id ?? "",
          "x-company-id": user?.companyId ?? "",
        },
        body: JSON.stringify({
          type: "custom",
          to: email,
          subject: `Profit & Loss Report: ${from} to ${to}`,
          message: `Please find the Profit & Loss report for the period ${from} to ${to}.`,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Email sent successfully");
      } else {
        toast.error(data.error || "Failed to send email");
      }
    } catch {
      toast.error("Error sending email");
    } finally {
      setSendingEmail(false);
    }
  };

  const profit = report?.netProfit ?? 0;
  const isProfitable = profit >= 0;

  const panelBg = "var(--panel-bg, #0f1729)";
  const border = "var(--border, #1e2a45)";
  const textPrimary = "var(--text-primary, #f1f5f9)";
  const textMuted = "var(--text-muted, #94a3b8)";

  return (
    <div style={{ minHeight: "100vh", background: "var(--app-bg, #060918)", padding: "28px 24px", fontFamily: "'Outfit','Inter',sans-serif", color: textPrimary }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 4px", letterSpacing: -0.5 }}>Profit &amp; Loss Statement</h1>
          <p style={{ margin: 0, fontSize: 13, color: textMuted }}>Trading &amp; P&amp;L — Income vs Expenses</p>
        </div>

        <div className="print:hidden" style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 10, color: textMuted, textTransform: "uppercase", letterSpacing: 0.6 }}>From</label>
            <input
              type="date"
              value={from}
              onChange={e => setFrom(e.target.value)}
              style={{ background: panelBg, border: `1px solid ${border}`, borderRadius: 8, padding: "7px 10px", color: textPrimary, fontSize: 13, outline: "none" }}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 10, color: textMuted, textTransform: "uppercase", letterSpacing: 0.6 }}>To</label>
            <input
              type="date"
              value={to}
              onChange={e => setTo(e.target.value)}
              style={{ background: panelBg, border: `1px solid ${border}`, borderRadius: 8, padding: "7px 10px", color: textPrimary, fontSize: 13, outline: "none" }}
            />
          </div>
          <button
            onClick={load}
            disabled={loading}
            style={{ background: "#6366f1", color: "#fff", border: "none", borderRadius: 8, padding: "8px 18px", fontSize: 13, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}
          >
            {loading ? "Loading…" : "Run Report"}
          </button>
          <button
            onClick={() => window.print()}
            style={{ background: "transparent", color: textMuted, border: `1px solid ${border}`, borderRadius: 8, padding: "8px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
          >
            Print
          </button>
          <button
            onClick={sendEmail}
            disabled={sendingEmail || !report}
            style={{ background: "transparent", color: "#4ade80", border: "1px solid rgba(74,222,128,0.3)", borderRadius: 8, padding: "8px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: (sendingEmail || !report) ? 0.5 : 1 }}
          >
            {sendingEmail ? "Sending…" : "Email"}
          </button>
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, padding: "12px 16px", marginBottom: 20, color: "#f87171", fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* ── Loading ── */}
      {loading && !report && (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: 200, color: textMuted, fontSize: 14 }}>
          Loading report…
        </div>
      )}

      {/* ── Report ── */}
      {report && (
        <>
          <div style={{ textAlign: "center", marginBottom: 20, fontSize: 13, color: textMuted }}>
            Period:{" "}
            <strong style={{ color: textPrimary }}>{from}</strong>
            {" "}to{" "}
            <strong style={{ color: textPrimary }}>{to}</strong>
          </div>

          {/* Two-column table */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>

            {/* Expenses */}
            <div style={{ background: panelBg, border: `1px solid ${border}`, borderRadius: 12, overflow: "hidden" }}>
              <div style={{ background: "rgba(239,68,68,0.1)", padding: "10px 16px", borderBottom: `1px solid ${border}`, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#f87171", display: "inline-block" }} />
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "#f87171" }}>Expenses / Outflows</span>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <tbody>
                  {report.expense.length === 0 ? (
                    <tr>
                      <td colSpan={2} style={{ padding: "24px 16px", textAlign: "center", color: textMuted, fontSize: 13 }}>No expenses in this period</td>
                    </tr>
                  ) : report.expense.map((item, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${border}` }}>
                      <td style={{ padding: "10px 16px", fontSize: 13, color: textPrimary }}>{item.name}</td>
                      <td style={{ padding: "10px 16px", textAlign: "right", fontWeight: 600, fontSize: 13, color: "#fca5a5" }}>{fmt(item.amount)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: "rgba(239,68,68,0.07)", borderTop: `2px solid rgba(239,68,68,0.2)` }}>
                    <td style={{ padding: "12px 16px", fontWeight: 700, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5, color: "#f87171" }}>Total Expenses</td>
                    <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: 800, fontSize: 15, color: "#f87171" }}>{fmt(report.totalExpense)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Income */}
            <div style={{ background: panelBg, border: `1px solid ${border}`, borderRadius: 12, overflow: "hidden" }}>
              <div style={{ background: "rgba(34,197,94,0.08)", padding: "10px 16px", borderBottom: `1px solid ${border}`, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#4ade80", display: "inline-block" }} />
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "#4ade80" }}>Income / Inflows</span>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <tbody>
                  {report.income.length === 0 ? (
                    <tr>
                      <td colSpan={2} style={{ padding: "24px 16px", textAlign: "center", color: textMuted, fontSize: 13 }}>No income in this period</td>
                    </tr>
                  ) : report.income.map((item, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${border}` }}>
                      <td style={{ padding: "10px 16px", fontSize: 13, color: textPrimary }}>{item.name}</td>
                      <td style={{ padding: "10px 16px", textAlign: "right", fontWeight: 600, fontSize: 13, color: "#86efac" }}>{fmt(item.amount)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: "rgba(34,197,94,0.07)", borderTop: `2px solid rgba(34,197,94,0.2)` }}>
                    <td style={{ padding: "12px 16px", fontWeight: 700, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5, color: "#4ade80" }}>Total Income</td>
                    <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: 800, fontSize: 15, color: "#4ade80" }}>{fmt(report.totalIncome)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* KPI summary row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div style={{ background: panelBg, border: `1px solid ${border}`, borderRadius: 12, padding: "18px 20px" }}>
              <div style={{ fontSize: 11, color: textMuted, textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 8 }}>Total Revenue</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: "#4ade80" }}>{fmt(report.totalIncome)}</div>
            </div>
            <div style={{ background: panelBg, border: `1px solid ${border}`, borderRadius: 12, padding: "18px 20px" }}>
              <div style={{ fontSize: 11, color: textMuted, textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 8 }}>Total Expenses</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: "#f87171" }}>{fmt(report.totalExpense)}</div>
            </div>
            <div style={{
              background: isProfitable ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
              border: `1px solid ${isProfitable ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)"}`,
              borderRadius: 12, padding: "18px 20px"
            }}>
              <div style={{ fontSize: 11, color: textMuted, textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 8 }}>
                Net {isProfitable ? "Profit" : "Loss"}
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, color: isProfitable ? "#4ade80" : "#f87171" }}>
                {isProfitable ? "" : "−"}{fmt(profit)}
              </div>
            </div>
          </div>
        </>
      )}

      <style>{`
        @media print {
          body { background: white !important; color: black !important; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  );
}
