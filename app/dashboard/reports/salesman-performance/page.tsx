"use client";
import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";

const ff = "'Outfit','Inter',sans-serif";
function fmt(n: number) { return n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 }); }

interface Row { salesmanName: string; totalSales: number; totalProfit: number; marginPct: number; invoiceCount: number; newCustomers: number; returnsValue: number; target: number; achievementPct: number; }

export default function SalesmanPerformancePage() {
  const user = getCurrentUser();
  const [data, setData]       = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod]   = useState("month");
  const cur = "Rs";

  const h = (): Record<string, string> => ({ "x-user-role": user?.role || "", "x-user-id": user?.id || "", "x-company-id": user?.companyId || "" });
  useEffect(() => { setLoading(true); fetch(`/api/reports/salesman-performance?period=${period}`, { headers: h() }).then(r => r.ok ? r.json() : {}).then(d => { setData(d.rows || []); setLoading(false); }).catch(() => setLoading(false)); }, [period]);

  const inp: React.CSSProperties = { background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 8, padding: "7px 12px", color: "var(--text-primary)", fontFamily: ff, fontSize: 12, outline: "none" };

  return (
    <div style={{ padding: "24px 28px", fontFamily: ff, color: "var(--text-primary)", maxWidth: 1100 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, letterSpacing: "-.3px" }}>Salesman Performance</h1>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-muted)" }}>Track sales team performance, targets, and achievements</p>
        </div>
        <select value={period} onChange={e => setPeriod(e.target.value)} style={inp}>
          <option value="month">This Month</option><option value="quarter">This Quarter</option><option value="year">This Year</option>
        </select>
      </div>
      <div style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              {["#", "Salesman", "Total Sales", "Profit", "Margin", "Invoices", "New Customers", "Target", "Achievement"].map((h, i) => (
                <th key={h} style={{ padding: "11px 14px", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".06em", textAlign: i > 1 ? "right" : "left" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={9} style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>Loading…</td></tr>
            : data.length === 0 ? <tr><td colSpan={9} style={{ padding: 48, textAlign: "center", color: "var(--text-muted)" }}><div style={{ fontSize: 32, marginBottom: 8 }}>👤</div>No salesman data — assign salesman on invoices to track</td></tr>
            : [...data].sort((a, b) => b.totalSales - a.totalSales).map((r, i) => {
              const ach = r.achievementPct;
              const achColor = ach >= 100 ? "#34d399" : ach >= 75 ? "#fbbf24" : "#f87171";
              return (
                <tr key={i} style={{ borderBottom: i < data.length - 1 ? "1px solid var(--border)" : "none" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--app-bg)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                  <td style={{ padding: "12px 14px", fontSize: 12, color: "var(--text-muted)", fontWeight: 700 }}>{i + 1}</td>
                  <td style={{ padding: "12px 14px", fontSize: 13, fontWeight: 600 }}>{r.salesmanName}</td>
                  <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 13, fontWeight: 700 }}>{cur} {fmt(r.totalSales)}</td>
                  <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 13, color: "#34d399" }}>{cur} {fmt(r.totalProfit)}</td>
                  <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 13 }}>{r.marginPct.toFixed(1)}%</td>
                  <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 13 }}>{r.invoiceCount}</td>
                  <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 13 }}>{r.newCustomers}</td>
                  <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 13, color: "var(--text-muted)" }}>{r.target > 0 ? `${cur} ${fmt(r.target)}` : "—"}</td>
                  <td style={{ padding: "12px 14px", textAlign: "right" }}>
                    {r.target > 0 ? (
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3 }}>
                        <span style={{ fontSize: 13, fontWeight: 800, color: achColor }}>{ach.toFixed(1)}%</span>
                        <div style={{ width: 70, height: 4, background: "var(--border)", borderRadius: 2 }}>
                          <div style={{ height: 4, borderRadius: 2, width: `${Math.min(ach, 100)}%`, background: achColor }} />
                        </div>
                      </div>
                    ) : <span style={{ fontSize: 12, color: "var(--text-muted)" }}>No target</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
