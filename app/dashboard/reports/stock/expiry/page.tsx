"use client";
import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";

const ff = "'Outfit','Inter',sans-serif";
function fmt(n: number) { return n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 }); }

interface ExpiryRow { itemName: string; batchNo: string; qty: number; expiryDate: string; daysToExpiry: number; value: number; status: "expired" | "critical" | "warning" | "ok"; }

const STATUS: Record<string, { label: string; color: string; bg: string }> = {
  expired:  { label: "Expired 💀",    color: "#f87171", bg: "rgba(248,113,113,.1)" },
  critical: { label: "< 30 days 🚨",  color: "#f97316", bg: "rgba(249,115,22,.1)" },
  warning:  { label: "< 90 days ⚠️",  color: "#fbbf24", bg: "rgba(251,191,36,.1)" },
  ok:       { label: "OK ✅",          color: "#34d399", bg: "rgba(52,211,153,.1)" },
};

export default function StockExpiryPage() {
  const user = getCurrentUser();
  const [data, setData]       = useState<ExpiryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState<"all" | "expired" | "critical" | "warning">("all");
  const cur = "Rs";

  const h = (): Record<string, string> => ({ "x-user-role": user?.role || "", "x-user-id": user?.id || "", "x-company-id": user?.companyId || "" });
  useEffect(() => { setLoading(true); fetch("/api/reports/stock/expiry", { headers: h() }).then(r => r.ok ? r.json() : {}).then(d => { setData(d.rows || []); setLoading(false); }).catch(() => setLoading(false)); }, []);

  const filtered = filter === "all" ? data : data.filter(r => r.status === filter);
  const atRisk   = data.filter(r => r.status !== "ok").reduce((s, r) => s + r.value, 0);

  return (
    <div style={{ padding: "24px 28px", fontFamily: ff, color: "var(--text-primary)", maxWidth: 1100 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, letterSpacing: "-.3px" }}>Batch / Expiry Report</h1>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-muted)" }}>FMCG / Pharma — track expiry before stock becomes waste</p>
        </div>
      </div>

      {atRisk > 0 && (
        <div style={{ marginBottom: 20, padding: "14px 18px", borderRadius: 12, background: "rgba(248,113,113,.07)", border: "1px solid rgba(248,113,113,.2)" }}>
          <span style={{ fontWeight: 700, color: "#f87171" }}>⚠️ At-risk stock value: {cur} {fmt(atRisk)}</span>
          <span style={{ fontSize: 12, color: "var(--text-muted)", marginLeft: 12 }}>— Take action before expiry</span>
        </div>
      )}

      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        {(["all", "expired", "critical", "warning"] as const).map(v => (
          <button key={v} onClick={() => setFilter(v)} style={{ padding: "7px 16px", borderRadius: 20, border: `1px solid ${filter === v ? "rgba(99,102,241,.4)" : "var(--border)"}`, background: filter === v ? "rgba(99,102,241,.1)" : "transparent", color: filter === v ? "#818cf8" : "var(--text-muted)", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: ff, textTransform: "capitalize" }}>{v === "all" ? `All (${data.length})` : v === "expired" ? `Expired (${data.filter(r => r.status === "expired").length})` : v === "critical" ? `Critical (${data.filter(r => r.status === "critical").length})` : `Warning (${data.filter(r => r.status === "warning").length})`}</button>
        ))}
      </div>

      <div style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              {["Item", "Batch No", "Qty", "Value", "Expiry Date", "Days Left", "Status"].map((h, i) => (
                <th key={h} style={{ padding: "11px 14px", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".06em", textAlign: i > 1 ? "right" : "left" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={7} style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>Loading…</td></tr>
            : filtered.length === 0 ? <tr><td colSpan={7} style={{ padding: 48, textAlign: "center", color: "var(--text-muted)" }}><div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>No expiry issues found</td></tr>
            : filtered.sort((a, b) => a.daysToExpiry - b.daysToExpiry).map((r, i) => {
              const s = STATUS[r.status];
              return (
                <tr key={i} style={{ borderBottom: i < filtered.length - 1 ? "1px solid var(--border)" : "none" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--app-bg)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                  <td style={{ padding: "12px 14px", fontSize: 13, fontWeight: 600 }}>{r.itemName}</td>
                  <td style={{ padding: "12px 14px", fontSize: 12, color: "#818cf8", fontWeight: 700 }}>{r.batchNo}</td>
                  <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 13 }}>{fmt(r.qty)}</td>
                  <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 13 }}>{cur} {fmt(r.value)}</td>
                  <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 12 }}>{new Date(r.expiryDate).toLocaleDateString()}</td>
                  <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 13, fontWeight: 800, color: s.color }}>{r.daysToExpiry < 0 ? `${Math.abs(r.daysToExpiry)}d ago` : `${r.daysToExpiry}d`}</td>
                  <td style={{ padding: "12px 14px", textAlign: "right" }}>
                    <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: s.bg, color: s.color }}>{s.label}</span>
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
