"use client";
import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";

const ff = "'Outfit','Inter',sans-serif";
function fmt(n: number) { return n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 }); }

interface Row { poNumber: string; supplierName: string; poDate: string; expectedDate: string; receivedDate: string | null; totalValue: number; receivedValue: number; pendingValue: number; status: "draft" | "sent" | "partial" | "received" | "cancelled"; }

const STATUS: Record<string, { label: string; color: string; bg: string }> = {
  draft:      { label: "Draft",          color: "var(--text-muted)", bg: "var(--app-bg)" },
  sent:       { label: "Sent",           color: "#818cf8", bg: "rgba(129,140,248,.1)" },
  partial:    { label: "Partial",        color: "#fbbf24", bg: "rgba(251,191,36,.1)" },
  received:   { label: "Received ✓",    color: "#34d399", bg: "rgba(52,211,153,.1)" },
  cancelled:  { label: "Cancelled",      color: "#f87171", bg: "rgba(248,113,113,.1)" },
};

export default function PoTrackingPage() {
  const user = getCurrentUser();
  const [data, setData]       = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod]   = useState("month");
  const [status, setStatus]   = useState("all");
  const cur = "Rs";

  const h = (): Record<string, string> => ({ "x-user-role": user?.role || "", "x-user-id": user?.id || "", "x-company-id": user?.companyId || "" });
  useEffect(() => { setLoading(true); fetch(`/api/reports/po-tracking?period=${period}`, { headers: h() }).then(r => r.ok ? r.json() : {}).then(d => { setData(d.rows || []); setLoading(false); }).catch(() => setLoading(false)); }, [period]);

  const filtered = status === "all" ? data : data.filter(r => r.status === status);
  const pendingTotal = data.filter(r => r.status === "sent" || r.status === "partial").reduce((s, r) => s + r.pendingValue, 0);

  const inp: React.CSSProperties = { background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 8, padding: "7px 12px", color: "var(--text-primary)", fontFamily: ff, fontSize: 12, outline: "none" };

  return (
    <div style={{ padding: "24px 28px", fontFamily: ff, color: "var(--text-primary)", maxWidth: 1100 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, letterSpacing: "-.3px" }}>Purchase Order Tracking</h1>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-muted)" }}>Track all POs — pending, partial, and received</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <select value={status} onChange={e => setStatus(e.target.value)} style={inp}>
            <option value="all">All Statuses</option>
            <option value="sent">Sent</option>
            <option value="partial">Partial</option>
            <option value="received">Received</option>
            <option value="draft">Draft</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select value={period} onChange={e => setPeriod(e.target.value)} style={inp}>
            <option value="month">This Month</option><option value="quarter">This Quarter</option><option value="year">This Year</option>
          </select>
        </div>
      </div>

      {pendingTotal > 0 && (
        <div style={{ marginBottom: 20, padding: "14px 18px", borderRadius: 12, background: "rgba(251,191,36,.07)", border: "1px solid rgba(251,191,36,.25)", display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 20 }}>⏳</span>
          <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
            <span style={{ fontWeight: 700, color: "#fbbf24" }}>{cur} {fmt(pendingTotal)}</span> worth of POs awaiting delivery
          </span>
        </div>
      )}

      <div style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              {["PO #", "Supplier", "PO Date", "Expected", "Received Date", "Total Value", "Received", "Pending", "Status"].map((h, i) => (
                <th key={h} style={{ padding: "11px 14px", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".06em", textAlign: i > 1 ? "right" : "left" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={9} style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>Loading…</td></tr>
            : filtered.length === 0 ? <tr><td colSpan={9} style={{ padding: 48, textAlign: "center", color: "var(--text-muted)" }}><div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>No purchase orders found</td></tr>
            : filtered.map((r, i) => {
              const s = STATUS[r.status];
              return (
                <tr key={i} style={{ borderBottom: i < filtered.length - 1 ? "1px solid var(--border)" : "none" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--app-bg)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                  <td style={{ padding: "12px 14px", fontSize: 12, color: "#818cf8" }}>{r.poNumber}</td>
                  <td style={{ padding: "12px 14px", fontSize: 13, fontWeight: 600 }}>{r.supplierName}</td>
                  <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 12, color: "var(--text-muted)" }}>{r.poDate}</td>
                  <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 12, color: "var(--text-muted)" }}>{r.expectedDate}</td>
                  <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 12, color: "var(--text-muted)" }}>{r.receivedDate || "—"}</td>
                  <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 13 }}>{cur} {fmt(r.totalValue)}</td>
                  <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 13, color: "#34d399" }}>{r.receivedValue > 0 ? `${cur} ${fmt(r.receivedValue)}` : "—"}</td>
                  <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 13, fontWeight: 700, color: r.pendingValue > 0 ? "#fbbf24" : "var(--text-muted)" }}>{r.pendingValue > 0 ? `${cur} ${fmt(r.pendingValue)}` : "—"}</td>
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
