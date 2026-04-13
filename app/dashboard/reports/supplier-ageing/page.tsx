"use client";
import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";

const ff = "'Outfit','Inter',sans-serif";
function fmt(n: number) { return n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 }); }

interface Row { supplierName: string; current: number; days30: number; days60: number; days90: number; over90: number; total: number; }

export default function SupplierAgeingPage() {
  const user = getCurrentUser();
  const [data, setData]       = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const cur = "Rs";

  const h = (): Record<string, string> => ({ "x-user-role": user?.role || "", "x-user-id": user?.id || "", "x-company-id": user?.companyId || "" });
  useEffect(() => { setLoading(true); fetch("/api/reports/supplier-ageing", { headers: h() }).then(r => r.ok ? r.json() : {}).then(d => { setData(d.rows || []); setLoading(false); }).catch(() => setLoading(false)); }, []);

  const totals = { current: data.reduce((s, r) => s + r.current, 0), d30: data.reduce((s, r) => s + r.days30, 0), d60: data.reduce((s, r) => s + r.days60, 0), d90: data.reduce((s, r) => s + r.days90, 0), over90: data.reduce((s, r) => s + r.over90, 0), total: data.reduce((s, r) => s + r.total, 0) };
  const overdue = totals.d30 + totals.d60 + totals.d90 + totals.over90;

  return (
    <div style={{ padding: "24px 28px", fontFamily: ff, color: "var(--text-primary)", maxWidth: 1100 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, letterSpacing: "-.3px" }}>Supplier Ageing (AP)</h1>
        <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-muted)" }}>How much you owe suppliers — and for how long</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 20 }}>
        {[
          { label: "Total Payable",  value: `${cur} ${fmt(totals.total)}`, color: "#818cf8", bg: "rgba(129,140,248,.07)", border: "rgba(129,140,248,.2)" },
          { label: "Current (0–30)", value: `${cur} ${fmt(totals.current)}`, color: "#34d399", bg: "rgba(52,211,153,.07)", border: "rgba(52,211,153,.2)" },
          { label: "Overdue",        value: `${cur} ${fmt(overdue)}`,       color: "#f87171", bg: "rgba(248,113,113,.07)", border: "rgba(248,113,113,.2)" },
        ].map((c, i) => (
          <div key={i} style={{ borderRadius: 14, padding: "18px 20px", background: c.bg, border: `1px solid ${c.border}` }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 8 }}>{c.label}</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: c.color }}>{c.value}</div>
          </div>
        ))}
      </div>

      <div style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              {["Supplier", "Current", "1–30 Days", "31–60 Days", "61–90 Days", "90+ Days", "Total"].map((h, i) => (
                <th key={h} style={{ padding: "11px 14px", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".06em", textAlign: i > 0 ? "right" : "left" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={7} style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>Loading…</td></tr>
            : data.length === 0 ? <tr><td colSpan={7} style={{ padding: 48, textAlign: "center", color: "var(--text-muted)" }}><div style={{ fontSize: 32, marginBottom: 8 }}>🤝</div>No outstanding payables</td></tr>
            : [...data].sort((a, b) => b.total - a.total).map((r, i) => (
              <tr key={i} style={{ borderBottom: i < data.length - 1 ? "1px solid var(--border)" : "none" }}
                onMouseEnter={e => (e.currentTarget.style.background = "var(--app-bg)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                <td style={{ padding: "12px 14px", fontSize: 13, fontWeight: 600 }}>{r.supplierName}</td>
                <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 13, color: "#34d399" }}>{r.current > 0 ? `${cur} ${fmt(r.current)}` : "—"}</td>
                <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 13, color: r.days30 > 0 ? "#fbbf24" : "var(--text-muted)" }}>{r.days30 > 0 ? `${cur} ${fmt(r.days30)}` : "—"}</td>
                <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 13, color: r.days60 > 0 ? "#fb923c" : "var(--text-muted)" }}>{r.days60 > 0 ? `${cur} ${fmt(r.days60)}` : "—"}</td>
                <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 13, color: r.days90 > 0 ? "#f87171" : "var(--text-muted)" }}>{r.days90 > 0 ? `${cur} ${fmt(r.days90)}` : "—"}</td>
                <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 13, color: r.over90 > 0 ? "#ef4444" : "var(--text-muted)", fontWeight: r.over90 > 0 ? 700 : 400 }}>{r.over90 > 0 ? `${cur} ${fmt(r.over90)}` : "—"}</td>
                <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 13, fontWeight: 800 }}>{cur} {fmt(r.total)}</td>
              </tr>
            ))}
            {data.length > 0 && (
              <tr style={{ borderTop: "2px solid var(--border)", background: "var(--app-bg)" }}>
                <td style={{ padding: "11px 14px", fontSize: 12, fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase" }}>Total</td>
                <td style={{ padding: "11px 14px", textAlign: "right", fontSize: 13, fontWeight: 800, color: "#34d399" }}>{cur} {fmt(totals.current)}</td>
                <td style={{ padding: "11px 14px", textAlign: "right", fontSize: 13, fontWeight: 800, color: "#fbbf24" }}>{cur} {fmt(totals.d30)}</td>
                <td style={{ padding: "11px 14px", textAlign: "right", fontSize: 13, fontWeight: 800, color: "#fb923c" }}>{cur} {fmt(totals.d60)}</td>
                <td style={{ padding: "11px 14px", textAlign: "right", fontSize: 13, fontWeight: 800, color: "#f87171" }}>{cur} {fmt(totals.d90)}</td>
                <td style={{ padding: "11px 14px", textAlign: "right", fontSize: 13, fontWeight: 800, color: "#ef4444" }}>{cur} {fmt(totals.over90)}</td>
                <td style={{ padding: "11px 14px", textAlign: "right", fontSize: 13, fontWeight: 900 }}>{cur} {fmt(totals.total)}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
