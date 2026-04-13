"use client";
import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";

const ff = "'Outfit','Inter',sans-serif";
function fmt(n: number) { return n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 }); }

interface Row { name: string; type: "customer" | "supplier"; totalInvoiced: number; totalPaid: number; totalOutstanding: number; avgDaysToPay: number; onTimeCount: number; lateCount: number; lastPaymentDate: string; }

export default function PaymentHistoryPage() {
  const user = getCurrentUser();
  const [data, setData]       = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod]   = useState("year");
  const [view, setView]       = useState<"customer" | "supplier">("customer");
  const cur = "Rs";

  const h = (): Record<string, string> => ({ "x-user-role": user?.role || "", "x-user-id": user?.id || "", "x-company-id": user?.companyId || "" });
  useEffect(() => { setLoading(true); fetch(`/api/reports/payment-history?period=${period}&view=${view}`, { headers: h() }).then(r => r.ok ? r.json() : {}).then(d => { setData(d.rows || []); setLoading(false); }).catch(() => setLoading(false)); }, [period, view]);

  const inp: React.CSSProperties = { background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 8, padding: "7px 12px", color: "var(--text-primary)", fontFamily: ff, fontSize: 12, outline: "none" };

  return (
    <div style={{ padding: "24px 28px", fontFamily: ff, color: "var(--text-primary)", maxWidth: 1100 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, letterSpacing: "-.3px" }}>Payment History</h1>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-muted)" }}>Who pays on time — and who delays</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ display: "flex", borderRadius: 9, overflow: "hidden", border: "1px solid var(--border)" }}>
            {(["customer", "supplier"] as const).map(v => (
              <button key={v} onClick={() => setView(v)} style={{ padding: "7px 14px", background: view === v ? "#6366f1" : "var(--panel-bg)", border: "none", color: view === v ? "white" : "var(--text-muted)", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: ff, textTransform: "capitalize" }}>{v}</button>
            ))}
          </div>
          <select value={period} onChange={e => setPeriod(e.target.value)} style={inp}>
            <option value="month">This Month</option><option value="quarter">This Quarter</option><option value="year">This Year</option>
          </select>
        </div>
      </div>

      <div style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              {[view === "customer" ? "Customer" : "Supplier", "Invoiced", "Paid", "Outstanding", "Avg Days to Pay", "On Time", "Late", "Last Payment"].map((h, i) => (
                <th key={h} style={{ padding: "11px 14px", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".06em", textAlign: i > 0 ? "right" : "left" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={8} style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>Loading…</td></tr>
            : data.length === 0 ? <tr><td colSpan={8} style={{ padding: 48, textAlign: "center", color: "var(--text-muted)" }}><div style={{ fontSize: 32, marginBottom: 8 }}>💳</div>No payment history found</td></tr>
            : [...data].sort((a, b) => b.totalPaid - a.totalPaid).map((r, i) => {
              const daysColor = r.avgDaysToPay <= 15 ? "#34d399" : r.avgDaysToPay <= 30 ? "#fbbf24" : "#f87171";
              const outstanding = r.totalOutstanding > 0;
              return (
                <tr key={i} style={{ borderBottom: i < data.length - 1 ? "1px solid var(--border)" : "none" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--app-bg)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                  <td style={{ padding: "12px 14px", fontSize: 13, fontWeight: 600 }}>{r.name}</td>
                  <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 13 }}>{cur} {fmt(r.totalInvoiced)}</td>
                  <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 13, color: "#34d399", fontWeight: 700 }}>{cur} {fmt(r.totalPaid)}</td>
                  <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 13, color: outstanding ? "#f87171" : "var(--text-muted)", fontWeight: outstanding ? 700 : 400 }}>{outstanding ? `${cur} ${fmt(r.totalOutstanding)}` : "—"}</td>
                  <td style={{ padding: "12px 14px", textAlign: "right" }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: daysColor }}>{r.avgDaysToPay} days</span>
                  </td>
                  <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 13, color: "#34d399" }}>{r.onTimeCount}</td>
                  <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 13, color: r.lateCount > 0 ? "#f87171" : "var(--text-muted)" }}>{r.lateCount > 0 ? r.lateCount : "—"}</td>
                  <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 12, color: "var(--text-muted)" }}>{r.lastPaymentDate || "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
