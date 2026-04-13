"use client";
import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";

const ff = "'Outfit','Inter',sans-serif";
function fmt(n: number) { return n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 }); }

interface Row { customerName: string; invoiceNo: string; invoiceDate: string; dueDate: string; amount: number; daysOverdue: number; status: "at_risk" | "probable_bad" | "written_off"; }

const STATUS: Record<string, { label: string; color: string; bg: string }> = {
  at_risk:      { label: "At Risk",      color: "#fbbf24", bg: "rgba(251,191,36,.1)" },
  probable_bad: { label: "Probable Bad", color: "#fb923c", bg: "rgba(251,146,60,.1)" },
  written_off:  { label: "Written Off",  color: "#f87171", bg: "rgba(248,113,113,.1)" },
};

export default function BadDebtsPage() {
  const user = getCurrentUser();
  const [data, setData]       = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState("all");
  const cur = "Rs";

  const h = (): Record<string, string> => ({ "x-user-role": user?.role || "", "x-user-id": user?.id || "", "x-company-id": user?.companyId || "" });
  useEffect(() => { setLoading(true); fetch("/api/reports/bad-debts", { headers: h() }).then(r => r.ok ? r.json() : {}).then(d => { setData(d.rows || []); setLoading(false); }).catch(() => setLoading(false)); }, []);

  const filtered = filter === "all" ? data : data.filter(r => r.status === filter);
  const totalAtRisk = data.filter(r => r.status !== "written_off").reduce((s, r) => s + r.amount, 0);
  const totalWrittenOff = data.filter(r => r.status === "written_off").reduce((s, r) => s + r.amount, 0);

  const inp: React.CSSProperties = { background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 8, padding: "7px 12px", color: "var(--text-primary)", fontFamily: ff, fontSize: 12, outline: "none" };

  return (
    <div style={{ padding: "24px 28px", fontFamily: ff, color: "var(--text-primary)", maxWidth: 1100 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, letterSpacing: "-.3px" }}>Bad Debts & At-Risk Receivables</h1>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-muted)" }}>Overdue invoices at risk of becoming bad debts</p>
        </div>
        <select value={filter} onChange={e => setFilter(e.target.value)} style={inp}>
          <option value="all">All Statuses</option>
          <option value="at_risk">At Risk (60–90 days)</option>
          <option value="probable_bad">Probable Bad (90+ days)</option>
          <option value="written_off">Written Off</option>
        </select>
      </div>

      {totalAtRisk > 0 && (
        <div style={{ marginBottom: 20, padding: "14px 18px", borderRadius: 12, background: "rgba(248,113,113,.07)", border: "1px solid rgba(248,113,113,.2)", display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 20 }}>⚠️</span>
          <div>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#f87171" }}>{cur} {fmt(totalAtRisk)}</span>
            <span style={{ fontSize: 13, color: "var(--text-muted)" }}> at risk of becoming bad debt · </span>
            <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{cur} {fmt(totalWrittenOff)} already written off</span>
          </div>
        </div>
      )}

      <div style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              {["Customer", "Invoice #", "Invoice Date", "Due Date", "Amount", "Days Overdue", "Status"].map((h, i) => (
                <th key={h} style={{ padding: "11px 14px", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".06em", textAlign: i > 1 ? "right" : "left" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={7} style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>Loading…</td></tr>
            : filtered.length === 0 ? <tr><td colSpan={7} style={{ padding: 48, textAlign: "center", color: "var(--text-muted)" }}><div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>No bad debts — all receivables are healthy</td></tr>
            : [...filtered].sort((a, b) => b.daysOverdue - a.daysOverdue).map((r, i) => {
              const s = STATUS[r.status];
              return (
                <tr key={i} style={{ borderBottom: i < filtered.length - 1 ? "1px solid var(--border)" : "none" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--app-bg)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                  <td style={{ padding: "12px 14px", fontSize: 13, fontWeight: 600 }}>{r.customerName}</td>
                  <td style={{ padding: "12px 14px", fontSize: 12, color: "#818cf8" }}>{r.invoiceNo}</td>
                  <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 12, color: "var(--text-muted)" }}>{r.invoiceDate}</td>
                  <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 12, color: "var(--text-muted)" }}>{r.dueDate}</td>
                  <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 13, fontWeight: 700 }}>{cur} {fmt(r.amount)}</td>
                  <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 13, fontWeight: 700, color: r.daysOverdue > 90 ? "#f87171" : r.daysOverdue > 60 ? "#fb923c" : "#fbbf24" }}>{r.daysOverdue} days</td>
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
