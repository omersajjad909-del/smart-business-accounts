"use client";
import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";

type Employee = { id: string; name: string; designation: string; salary: number };
type Advance = {
  id: string;
  employeeId: string;
  employeeName: string;
  amount: number;
  reason: string;
  deductMonths: number;
  deductedSoFar: number;
  status: "ACTIVE" | "CLEARED" | "PENDING";
  date: string;
};

const DEMO: Advance[] = [
  { id: "1", employeeId: "e1", employeeName: "Ahmed Raza", amount: 25000, reason: "Medical emergency", deductMonths: 3, deductedSoFar: 8333, status: "ACTIVE", date: "2025-01-15" },
  { id: "2", employeeId: "e2", employeeName: "Sara Khan", amount: 15000, reason: "House rent advance", deductMonths: 2, deductedSoFar: 15000, status: "CLEARED", date: "2024-12-01" },
  { id: "3", employeeId: "e3", employeeName: "Bilal Ahmed", amount: 10000, reason: "Personal need", deductMonths: 2, deductedSoFar: 0, status: "PENDING", date: "2025-02-10" },
];

const STATUS_COLOR: Record<string, string> = {
  ACTIVE: "#fbbf24", CLEARED: "#34d399", PENDING: "#818cf8",
};

function getHeaders(): Record<string, string> {
  const user = getCurrentUser();
  if (!user) return {};
  return {
    "x-user-id": user.id,
    "x-user-role": user.role ?? "",
    "x-company-id": user.companyId ?? "",
  };
}

export default function AdvanceSalaryPage() {
  const [advances, setAdvances] = useState<Advance[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ employeeName: "", amount: "", reason: "", deductMonths: "1" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    // Try real API, fallback to demo data
    fetch("/api/hr/advance-salary", { credentials: "include", headers: getHeaders() })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (Array.isArray(data?.advances)) setAdvances(data.advances);
        else setAdvances(DEMO);
      })
      .catch(() => setAdvances(DEMO))
      .finally(() => setLoading(false));
  }, []);

  const totalActive = advances.filter(a => a.status === "ACTIVE").reduce((s, a) => s + (a.amount - a.deductedSoFar), 0);
  const totalDisbursed = advances.reduce((s, a) => s + a.amount, 0);
  const totalCleared = advances.filter(a => a.status === "CLEARED").length;

  async function handleSave() {
    if (!form.employeeName || !form.amount) { setMsg("Employee name and amount required"); return; }
    setSaving(true);
    try {
      const r = await fetch("/api/hr/advance-salary", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json", ...getHeaders() },
        body: JSON.stringify({
          employeeName: form.employeeName,
          amount: parseFloat(form.amount),
          reason: form.reason,
          deductMonths: parseInt(form.deductMonths),
        }),
      });
      if (r.ok) {
        const d = await r.json();
        setAdvances(prev => [d.advance || {
          id: Date.now().toString(), employeeId: "", employeeName: form.employeeName,
          amount: parseFloat(form.amount), reason: form.reason,
          deductMonths: parseInt(form.deductMonths), deductedSoFar: 0,
          status: "PENDING" as const, date: new Date().toISOString().slice(0, 10),
        }, ...prev]);
        setMsg("Advance recorded successfully");
        setShowForm(false);
        setForm({ employeeName: "", amount: "", reason: "", deductMonths: "1" });
      } else {
        const j = await r.json().catch(() => ({}));
        setMsg(j?.error || "Failed to save");
      }
    } catch {
      setMsg("Error saving advance");
    } finally {
      setSaving(false);
    }
  }

  const s: Record<string, React.CSSProperties> = {
    page:   { padding: "28px 32px", maxWidth: 1100, margin: "0 auto" },
    header: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 },
    title:  { fontSize: 22, fontWeight: 800, color: "white", margin: 0 },
    sub:    { fontSize: 13, color: "rgba(255,255,255,.4)", marginTop: 3 },
    btn:    { padding: "10px 20px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#6366f1,#4f46e5)", color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer" },
    cards:  { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 24 },
    card:   { borderRadius: 14, padding: 20, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)" },
    clabel: { fontSize: 11, color: "rgba(255,255,255,.4)", fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: ".06em" },
    cval:   { fontSize: 26, fontWeight: 800, color: "white", marginTop: 6 },
    table:  { width: "100%", borderCollapse: "collapse" as const },
    th:     { padding: "10px 14px", textAlign: "left" as const, fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.35)", textTransform: "uppercase" as const, letterSpacing: ".06em", borderBottom: "1px solid rgba(255,255,255,.07)" },
    td:     { padding: "12px 14px", fontSize: 13, color: "rgba(255,255,255,.8)", borderBottom: "1px solid rgba(255,255,255,.05)" },
    modal:  { position: "fixed" as const, inset: 0, background: "rgba(0,0,0,.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 },
    mbox:   { background: "#0f1629", border: "1px solid rgba(255,255,255,.1)", borderRadius: 16, padding: 28, width: 420, maxWidth: "90vw" },
    label:  { fontSize: 12, color: "rgba(255,255,255,.5)", fontWeight: 600, display: "block", marginBottom: 6 },
    input:  { width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.05)", color: "white", fontSize: 13, outline: "none", boxSizing: "border-box" as const },
  };

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={s.header}>
        <div>
          <h1 style={s.title}>Advance Salary</h1>
          <p style={s.sub}>Manage employee salary advances and auto-deduction schedules</p>
        </div>
        <button style={s.btn} onClick={() => setShowForm(true)}>+ New Advance</button>
      </div>

      {/* KPI Cards */}
      <div style={s.cards}>
        <div style={s.card}>
          <div style={s.clabel}>Total Disbursed</div>
          <div style={s.cval}>Rs. {totalDisbursed.toLocaleString()}</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,.3)", marginTop: 4 }}>All time</div>
        </div>
        <div style={s.card}>
          <div style={s.clabel}>Outstanding Balance</div>
          <div style={{ ...s.cval, color: "#fbbf24" }}>Rs. {totalActive.toLocaleString()}</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,.3)", marginTop: 4 }}>Pending recovery</div>
        </div>
        <div style={s.card}>
          <div style={s.clabel}>Cleared Advances</div>
          <div style={{ ...s.cval, color: "#34d399" }}>{totalCleared}</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,.3)", marginTop: 4 }}>Fully recovered</div>
        </div>
      </div>

      {/* Table */}
      <div style={{ borderRadius: 14, border: "1px solid rgba(255,255,255,.08)", overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,.07)", fontSize: 14, fontWeight: 700, color: "white" }}>
          Advance Records
        </div>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,.3)" }}>Loading…</div>
        ) : (
          <table style={s.table}>
            <thead>
              <tr>
                {["Employee", "Date", "Amount", "Deduct Over", "Recovered", "Balance", "Status"].map(h => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {advances.length === 0 ? (
                <tr><td colSpan={7} style={{ ...s.td, textAlign: "center", padding: 32, color: "rgba(255,255,255,.25)" }}>No advance records yet</td></tr>
              ) : advances.map(a => {
                const balance = a.amount - a.deductedSoFar;
                const pct = Math.round((a.deductedSoFar / a.amount) * 100);
                return (
                  <tr key={a.id}>
                    <td style={s.td}>
                      <div style={{ fontWeight: 700, color: "white" }}>{a.employeeName}</div>
                      {a.reason && <div style={{ fontSize: 11, color: "rgba(255,255,255,.35)", marginTop: 2 }}>{a.reason}</div>}
                    </td>
                    <td style={s.td}>{a.date}</td>
                    <td style={s.td}>Rs. {a.amount.toLocaleString()}</td>
                    <td style={s.td}>{a.deductMonths} month{a.deductMonths !== 1 ? "s" : ""}</td>
                    <td style={s.td}>
                      <div>Rs. {a.deductedSoFar.toLocaleString()}</div>
                      <div style={{ marginTop: 4, height: 4, borderRadius: 2, background: "rgba(255,255,255,.08)", width: 80 }}>
                        <div style={{ width: `${pct}%`, height: "100%", borderRadius: 2, background: "#34d399" }} />
                      </div>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,.3)", marginTop: 2 }}>{pct}%</div>
                    </td>
                    <td style={{ ...s.td, color: balance > 0 ? "#fbbf24" : "#34d399", fontWeight: 700 }}>
                      Rs. {balance.toLocaleString()}
                    </td>
                    <td style={s.td}>
                      <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: `${STATUS_COLOR[a.status]}20`, color: STATUS_COLOR[a.status], border: `1px solid ${STATUS_COLOR[a.status]}40` }}>
                        {a.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* New Advance Modal */}
      {showForm && (
        <div style={s.modal} onClick={() => setShowForm(false)}>
          <div style={s.mbox} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 800, color: "white", marginBottom: 20 }}>Record Salary Advance</div>
            {msg && <div style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(248,113,113,.15)", color: "#f87171", fontSize: 12, marginBottom: 16 }}>{msg}</div>}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={s.label}>Employee Name</label>
                <input style={s.input} placeholder="e.g. Ahmed Raza" value={form.employeeName} onChange={e => setForm(p => ({ ...p, employeeName: e.target.value }))} />
              </div>
              <div>
                <label style={s.label}>Advance Amount (Rs.)</label>
                <input style={s.input} type="number" placeholder="25000" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} />
              </div>
              <div>
                <label style={s.label}>Reason</label>
                <input style={s.input} placeholder="Medical, rent, personal…" value={form.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))} />
              </div>
              <div>
                <label style={s.label}>Deduct Over (months)</label>
                <select style={s.input} value={form.deductMonths} onChange={e => setForm(p => ({ ...p, deductMonths: e.target.value }))}>
                  {[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n} month{n > 1 ? "s" : ""}</option>)}
                </select>
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                <button style={{ ...s.btn, flex: 1 }} onClick={handleSave} disabled={saving}>
                  {saving ? "Saving…" : "Save Advance"}
                </button>
                <button style={{ ...s.btn, background: "rgba(255,255,255,.06)", flex: 1 }} onClick={() => { setShowForm(false); setMsg(""); }}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
