"use client";
import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";

const ff = "'Outfit','Inter',sans-serif";
function fmt(n: number) { return n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 }); }

interface Row { supplierName: string; totalOrders: number; onTimeDelivery: number; onTimePct: number; qualityRejectCount: number; rejectRatePct: number; avgLeadDays: number; totalPurchased: number; rating: "excellent" | "good" | "average" | "poor"; }

const RATING: Record<string, { label: string; color: string; bg: string }> = {
  excellent: { label: "Excellent ⭐", color: "#34d399", bg: "rgba(52,211,153,.1)" },
  good:      { label: "Good",        color: "#818cf8", bg: "rgba(129,140,248,.1)" },
  average:   { label: "Average",     color: "#fbbf24", bg: "rgba(251,191,36,.1)" },
  poor:      { label: "Poor",        color: "#f87171", bg: "rgba(248,113,113,.1)" },
};

export default function SupplierPerformancePage() {
  const user = getCurrentUser();
  const [data, setData]       = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod]   = useState("year");
  const cur = "Rs";

  const h = (): Record<string, string> => ({ "x-user-role": user?.role || "", "x-user-id": user?.id || "", "x-company-id": user?.companyId || "" });
  useEffect(() => { setLoading(true); fetch(`/api/reports/supplier-performance?period=${period}`, { headers: h() }).then(r => r.ok ? r.json() : {}).then(d => { setData(d.rows || []); setLoading(false); }).catch(() => setLoading(false)); }, [period]);

  const inp: React.CSSProperties = { background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 8, padding: "7px 12px", color: "var(--text-primary)", fontFamily: ff, fontSize: 12, outline: "none" };
  const poorSuppliers = data.filter(r => r.rating === "poor").length;

  return (
    <div style={{ padding: "24px 28px", fontFamily: ff, color: "var(--text-primary)", maxWidth: 1100 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, letterSpacing: "-.3px" }}>Supplier Performance</h1>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-muted)" }}>On-time delivery, quality, and lead time — know your best & worst suppliers</p>
        </div>
        <select value={period} onChange={e => setPeriod(e.target.value)} style={inp}>
          <option value="month">This Month</option><option value="quarter">This Quarter</option><option value="year">This Year</option>
        </select>
      </div>

      {poorSuppliers > 0 && (
        <div style={{ marginBottom: 20, padding: "14px 18px", borderRadius: 12, background: "rgba(248,113,113,.07)", border: "1px solid rgba(248,113,113,.2)", display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 20 }}>⚠️</span>
          <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
            <span style={{ fontWeight: 700, color: "#f87171" }}>{poorSuppliers} supplier{poorSuppliers > 1 ? "s" : ""}</span> rated poor — consider switching vendors
          </span>
        </div>
      )}

      <div style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              {["#", "Supplier", "Orders", "On-Time %", "Rejects", "Reject Rate", "Avg Lead Time", "Total Purchased", "Rating"].map((h, i) => (
                <th key={h} style={{ padding: "11px 14px", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".06em", textAlign: i > 1 ? "right" : "left" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={9} style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>Loading…</td></tr>
            : data.length === 0 ? <tr><td colSpan={9} style={{ padding: 48, textAlign: "center", color: "var(--text-muted)" }}><div style={{ fontSize: 32, marginBottom: 8 }}>🏭</div>No supplier data found for this period</td></tr>
            : [...data].sort((a, b) => b.onTimePct - a.onTimePct).map((r, i) => {
              const rat = RATING[r.rating];
              const otColor = r.onTimePct >= 90 ? "#34d399" : r.onTimePct >= 70 ? "#fbbf24" : "#f87171";
              return (
                <tr key={i} style={{ borderBottom: i < data.length - 1 ? "1px solid var(--border)" : "none" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--app-bg)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                  <td style={{ padding: "12px 14px", fontSize: 12, color: "var(--text-muted)", fontWeight: 700 }}>{i + 1}</td>
                  <td style={{ padding: "12px 14px", fontSize: 13, fontWeight: 600 }}>{r.supplierName}</td>
                  <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 13 }}>{r.totalOrders}</td>
                  <td style={{ padding: "12px 14px", textAlign: "right" }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3 }}>
                      <span style={{ fontSize: 13, fontWeight: 800, color: otColor }}>{r.onTimePct.toFixed(1)}%</span>
                      <div style={{ width: 60, height: 4, background: "var(--border)", borderRadius: 2 }}>
                        <div style={{ height: 4, borderRadius: 2, width: `${r.onTimePct}%`, background: otColor }} />
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 13 }}>{r.qualityRejectCount || "—"}</td>
                  <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 13, color: r.rejectRatePct > 5 ? "#f87171" : "var(--text-muted)" }}>{r.rejectRatePct > 0 ? `${r.rejectRatePct.toFixed(1)}%` : "—"}</td>
                  <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 13 }}>{r.avgLeadDays} days</td>
                  <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 13, fontWeight: 700 }}>{cur} {fmt(r.totalPurchased)}</td>
                  <td style={{ padding: "12px 14px", textAlign: "right" }}>
                    <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: rat.bg, color: rat.color }}>{rat.label}</span>
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
