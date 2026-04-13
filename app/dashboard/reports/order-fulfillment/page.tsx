"use client";
import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";

const ff = "'Outfit','Inter',sans-serif";
function fmt(n: number) { return n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 }); }

interface Row { orderId: string; customerName: string; orderDate: string; promisedDate: string; fulfilledDate: string | null; status: "fulfilled" | "pending" | "delayed" | "cancelled"; daysVariance: number; value: number; }

const STATUS: Record<string, { label: string; color: string; bg: string }> = {
  fulfilled:  { label: "Fulfilled",  color: "#34d399", bg: "rgba(52,211,153,.1)" },
  pending:    { label: "Pending",    color: "#818cf8", bg: "rgba(129,140,248,.1)" },
  delayed:    { label: "Delayed",    color: "#f87171", bg: "rgba(248,113,113,.1)" },
  cancelled:  { label: "Cancelled",  color: "var(--text-muted)", bg: "var(--app-bg)" },
};

export default function OrderFulfillmentPage() {
  const user = getCurrentUser();
  const [data, setData]       = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod]   = useState("month");
  const [status, setStatus]   = useState("all");
  const cur = "Rs";

  const h = (): Record<string, string> => ({ "x-user-role": user?.role || "", "x-user-id": user?.id || "", "x-company-id": user?.companyId || "" });
  useEffect(() => { setLoading(true); fetch(`/api/reports/order-fulfillment?period=${period}`, { headers: h() }).then(r => r.ok ? r.json() : {}).then(d => { setData(d.rows || []); setLoading(false); }).catch(() => setLoading(false)); }, [period]);

  const filtered = status === "all" ? data : data.filter(r => r.status === status);
  const fulfilledOnTime = data.filter(r => r.status === "fulfilled" && r.daysVariance <= 0).length;
  const totalFulfilled  = data.filter(r => r.status === "fulfilled").length;
  const onTimeRate      = totalFulfilled > 0 ? (fulfilledOnTime / totalFulfilled) * 100 : 0;
  const delayedCount    = data.filter(r => r.status === "delayed").length;

  const inp: React.CSSProperties = { background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 8, padding: "7px 12px", color: "var(--text-primary)", fontFamily: ff, fontSize: 12, outline: "none" };

  return (
    <div style={{ padding: "24px 28px", fontFamily: ff, color: "var(--text-primary)", maxWidth: 1100 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, letterSpacing: "-.3px" }}>Order Fulfillment Rate</h1>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-muted)" }}>On-time delivery vs delays — spot bottlenecks early</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <select value={status} onChange={e => setStatus(e.target.value)} style={inp}>
            <option value="all">All Orders</option>
            <option value="fulfilled">Fulfilled</option>
            <option value="pending">Pending</option>
            <option value="delayed">Delayed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select value={period} onChange={e => setPeriod(e.target.value)} style={inp}>
            <option value="month">This Month</option><option value="quarter">This Quarter</option><option value="year">This Year</option>
          </select>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 20 }}>
        {[
          { label: "On-Time Rate",    value: `${onTimeRate.toFixed(1)}%`,    color: onTimeRate >= 90 ? "#34d399" : onTimeRate >= 70 ? "#fbbf24" : "#f87171", bg: "rgba(129,140,248,.07)", border: "rgba(129,140,248,.2)" },
          { label: "Delayed Orders",  value: `${delayedCount} orders`,        color: delayedCount > 0 ? "#f87171" : "#34d399",   bg: "rgba(248,113,113,.07)", border: "rgba(248,113,113,.2)" },
          { label: "Total Orders",    value: `${data.length}`,                color: "#818cf8",  bg: "rgba(129,140,248,.07)", border: "rgba(129,140,248,.2)" },
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
              {["Order ID", "Customer", "Order Date", "Promised Date", "Fulfilled Date", "Days +/-", "Value", "Status"].map((h, i) => (
                <th key={h} style={{ padding: "11px 14px", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".06em", textAlign: i > 1 ? "right" : "left" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={8} style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>Loading…</td></tr>
            : filtered.length === 0 ? <tr><td colSpan={8} style={{ padding: 48, textAlign: "center", color: "var(--text-muted)" }}><div style={{ fontSize: 32, marginBottom: 8 }}>📦</div>No orders found for this period</td></tr>
            : filtered.map((r, i) => {
              const s = STATUS[r.status];
              const varianceColor = r.daysVariance < 0 ? "#34d399" : r.daysVariance === 0 ? "var(--text-muted)" : "#f87171";
              return (
                <tr key={i} style={{ borderBottom: i < filtered.length - 1 ? "1px solid var(--border)" : "none" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--app-bg)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                  <td style={{ padding: "12px 14px", fontSize: 12, color: "#818cf8" }}>{r.orderId}</td>
                  <td style={{ padding: "12px 14px", fontSize: 13, fontWeight: 600 }}>{r.customerName}</td>
                  <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 12, color: "var(--text-muted)" }}>{r.orderDate}</td>
                  <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 12, color: "var(--text-muted)" }}>{r.promisedDate}</td>
                  <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 12, color: "var(--text-muted)" }}>{r.fulfilledDate || "—"}</td>
                  <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 13, fontWeight: 700, color: varianceColor }}>
                    {r.status === "pending" ? "—" : r.daysVariance === 0 ? "On time" : `${r.daysVariance > 0 ? "+" : ""}${r.daysVariance}d`}
                  </td>
                  <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 13 }}>{cur} {fmt(r.value)}</td>
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
