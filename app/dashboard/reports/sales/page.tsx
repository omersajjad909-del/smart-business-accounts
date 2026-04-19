"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { exportToCSV } from "@/lib/export";

const ff = "'Outfit','Inter',sans-serif";
function fmt(n: number) { return n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 }); }

type Account = { id: string; name: string };
type Row = { date: string; invoiceNo: string; customer: string; item: string; qty: number; rate: number; amount: number };

export default function SalesReportPage() {
  const router  = useRouter();
  const today   = new Date().toISOString().slice(0, 10);
  const [customers, setCustomers] = useState<Account[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [from, setFrom] = useState("2026-01-01");
  const [to, setTo]     = useState(today);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(false);

  const user = getCurrentUser();
  const h = () => ({ "x-user-id": user?.id||"", "x-user-role": user?.role||"", "x-company-id": user?.companyId||"" });

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    fetch("/api/accounts", { credentials: "include", headers: h() })
      .then(r => r.json())
      .then(d => setCustomers((Array.isArray(d) ? d : []).filter((a: any) => a.partyType === "CUSTOMER")))
      .catch(() => {});
    loadReport();
  }, []);

  async function loadReport() {
    setLoading(true);
    const qs = new URLSearchParams({ from, to, ...(customerId && { customerId }) });
    try {
      const r = await fetch(`/api/reports/sales?${qs}`, { credentials: "include", headers: h() });
      const d = await r.json();
      setRows(Array.isArray(d) ? d : []);
    } catch { setRows([]); }
    finally { setLoading(false); }
  }

  function close() {
    setVisible(false);
    setTimeout(() => router.back(), 260);
  }

  const totalQty    = rows.reduce((s, r) => s + (Number(r.qty)    || 0), 0);
  const totalAmount = rows.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const uniqueCustomers = new Set(rows.map(r => r.customer)).size;

  return (
    <>
      <style>{`@keyframes slideUp{from{opacity:0;transform:translateY(32px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* Backdrop */}
      <div onClick={close} style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,.55)", backdropFilter: "blur(4px)", opacity: visible ? 1 : 0, transition: "opacity .25s ease" }} />

      {/* Panel */}
      <div style={{ position: "fixed", inset: 0, zIndex: 1001, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 20px", pointerEvents: "none" }}>
        <div
          onClick={e => e.stopPropagation()}
          style={{
            width: "100%", maxWidth: 1040, maxHeight: "90vh",
            background: "var(--bg-primary, #0f1629)",
            border: "1px solid var(--border, rgba(255,255,255,.1))",
            borderRadius: 20, display: "flex", flexDirection: "column",
            overflow: "hidden", pointerEvents: "all",
            boxShadow: "0 32px 80px rgba(0,0,0,.6)",
            fontFamily: ff,
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(32px)",
            transition: "opacity .25s ease, transform .25s ease",
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 24px", borderBottom: "1px solid rgba(255,255,255,.08)", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(52,211,153,.12)", border: "1px solid rgba(52,211,153,.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>📊</div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text-primary, white)" }}>Sales Report</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,.4)", marginTop: 1 }}>Line-item breakdown of all sales invoices</div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {rows.length > 0 && (
                <button
                  onClick={() => exportToCSV(rows, "sales-report")}
                  style={{ padding: "7px 14px", borderRadius: 9, background: "rgba(52,211,153,.1)", border: "1px solid rgba(52,211,153,.25)", color: "#34d399", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: ff, display: "flex", alignItems: "center", gap: 6 }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  Export CSV
                </button>
              )}
              <button onClick={() => window.print()} style={{ padding: "7px 14px", borderRadius: 9, background: "transparent", border: "1px solid rgba(255,255,255,.1)", color: "rgba(255,255,255,.5)", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: ff, display: "flex", alignItems: "center", gap: 6 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                Print
              </button>
              <button onClick={close} style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(248,113,113,.1)", border: "1px solid rgba(248,113,113,.2)", color: "#f87171", fontSize: 16, cursor: "pointer", fontFamily: ff, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
            </div>
          </div>

          {/* Scrollable body */}
          <div style={{ overflowY: "auto", flex: 1 }}>

            {/* KPI row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, padding: "16px 24px 0" }}>
              {[
                { label: "Total Invoices",  val: new Set(rows.map(r => r.invoiceNo)).size, color: "#818cf8", icon: "🧾" },
                { label: "Customers",       val: uniqueCustomers,                          color: "#38bdf8", icon: "👥" },
                { label: "Total Amount",    val: `Rs ${fmt(totalAmount)}`,                 color: "#34d399", icon: "💰" },
              ].map(k => (
                <div key={k.label} style={{ padding: "14px 16px", borderRadius: 12, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 20 }}>{k.icon}</span>
                  <div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,.4)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em" }}>{k.label}</div>
                    <div style={{ fontSize: 20, fontWeight: 900, color: k.color, lineHeight: 1.3 }}>{k.val}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Filters */}
            <div style={{ display: "flex", gap: 10, padding: "14px 24px", flexWrap: "wrap", alignItems: "flex-end" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <label style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,.35)", textTransform: "uppercase", letterSpacing: ".06em" }}>Customer</label>
                <select
                  value={customerId} onChange={e => setCustomerId(e.target.value)}
                  style={{ padding: "8px 12px", borderRadius: 9, background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", color: "var(--text-primary, white)", fontSize: 13, outline: "none", fontFamily: ff, minWidth: 160 }}
                >
                  <option value="">All Customers</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              {[["From", from, setFrom], ["To", to, setTo]].map(([label, val, setter]: any) => (
                <div key={label} style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <label style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,.35)", textTransform: "uppercase", letterSpacing: ".06em" }}>{label}</label>
                  <input
                    type="date" value={val} onChange={e => setter(e.target.value)}
                    style={{ padding: "8px 12px", borderRadius: 9, background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", color: "var(--text-primary, white)", fontSize: 13, outline: "none", fontFamily: ff, colorScheme: "dark" }}
                  />
                </div>
              ))}
              <button
                onClick={loadReport}
                disabled={loading}
                style={{ padding: "9px 20px", borderRadius: 9, background: "linear-gradient(135deg,#6366f1,#4f46e5)", border: "none", color: "white", fontSize: 13, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", fontFamily: ff, opacity: loading ? 0.7 : 1 }}
              >
                {loading ? "Loading…" : "Show Report"}
              </button>
            </div>

            {/* Table */}
            <div style={{ margin: "0 24px 24px", borderRadius: 12, border: "1px solid rgba(255,255,255,.08)", overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.02)" }}>
                    {["Date","Invoice","Customer","Item","Qty","Rate","Amount"].map((h, i) => (
                      <th key={h} style={{ padding: "11px 12px", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.35)", textTransform: "uppercase", letterSpacing: ".06em", textAlign: i > 3 ? "right" : "left" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={7} style={{ padding: 48, textAlign: "center", color: "rgba(255,255,255,.3)", fontSize: 13 }}>Fetching data…</td></tr>
                  ) : rows.length === 0 ? (
                    <tr><td colSpan={7} style={{ padding: 48, textAlign: "center" }}>
                      <div style={{ fontSize: 32, marginBottom: 8 }}>📊</div>
                      <div style={{ fontSize: 13, color: "rgba(255,255,255,.3)", fontWeight: 600 }}>No sales data found</div>
                    </td></tr>
                  ) : rows.map((r, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,.05)", background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,.01)", transition: "background .15s" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "rgba(99,102,241,.05)")}
                      onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 0 ? "transparent" : "rgba(255,255,255,.01)")}
                    >
                      <td style={{ padding: "11px 12px", fontSize: 12, color: "rgba(255,255,255,.5)" }}>{r.date}</td>
                      <td style={{ padding: "11px 12px", fontSize: 12, fontWeight: 700, color: "#818cf8" }}>#{r.invoiceNo}</td>
                      <td style={{ padding: "11px 12px", fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,.8)" }}>{r.customer}</td>
                      <td style={{ padding: "11px 12px", fontSize: 12, color: "rgba(255,255,255,.6)" }}>{r.item}</td>
                      <td style={{ padding: "11px 12px", textAlign: "right", fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,.7)" }}>{fmt(r.qty)}</td>
                      <td style={{ padding: "11px 12px", textAlign: "right", fontSize: 12, color: "rgba(255,255,255,.5)" }}>{fmt(r.rate)}</td>
                      <td style={{ padding: "11px 12px", textAlign: "right", fontSize: 13, fontWeight: 800, color: "#34d399" }}>{fmt(r.amount)}</td>
                    </tr>
                  ))}
                </tbody>
                {!loading && rows.length > 0 && (
                  <tfoot>
                    <tr style={{ borderTop: "1px solid rgba(255,255,255,.1)", background: "rgba(52,211,153,.04)" }}>
                      <td colSpan={4} style={{ padding: "13px 12px", fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,.4)", textTransform: "uppercase", letterSpacing: ".06em" }}>
                        Grand Total — {rows.length} line item{rows.length !== 1 ? "s" : ""}
                      </td>
                      <td style={{ padding: "13px 12px", textAlign: "right", fontSize: 15, fontWeight: 900, color: "#818cf8" }}>{fmt(totalQty)}</td>
                      <td />
                      <td style={{ padding: "13px 12px", textAlign: "right", fontSize: 15, fontWeight: 900, color: "#34d399" }}>Rs {fmt(totalAmount)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
