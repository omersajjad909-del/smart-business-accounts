"use client";

import toast from "react-hot-toast";
import { useState } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";

const S = {
  page: { minHeight: "100vh", background: "#0f1117", color: "#fff", fontFamily: "'Outfit','Inter',sans-serif", padding: "32px" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px" },
  title: { fontSize: "24px", fontWeight: 700, margin: 0 },
  sub: { fontSize: "13px", color: "rgba(255,255,255,.45)", marginTop: "4px" },
  btn: { background: "linear-gradient(135deg,#10b981,#059669)", color: "#fff", border: "none", borderRadius: "10px", padding: "10px 20px", fontSize: "14px", fontWeight: 600, cursor: "pointer" },
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "16px", marginBottom: "28px" },
  statCard: { background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: "14px", padding: "20px" },
  statLabel: { fontSize: "12px", color: "rgba(255,255,255,.45)", marginBottom: "8px", textTransform: "uppercase" as const, letterSpacing: "0.5px" },
  statValue: { fontSize: "28px", fontWeight: 700 },
  statSub: { fontSize: "12px", color: "rgba(255,255,255,.35)", marginTop: "4px" },
  filters: { display: "flex", gap: "12px", marginBottom: "20px" },
  select: { background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", borderRadius: "8px", padding: "8px 14px", color: "#fff", fontSize: "13px", outline: "none" },
  table: { width: "100%", borderCollapse: "collapse" as const, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: "14px", overflow: "hidden" },
  th: { padding: "14px 16px", textAlign: "left" as const, fontSize: "11px", color: "rgba(255,255,255,.4)", textTransform: "uppercase" as const, letterSpacing: "0.5px", borderBottom: "1px solid rgba(255,255,255,.07)", background: "rgba(255,255,255,.02)" },
  td: { padding: "14px 16px", fontSize: "13px", color: "rgba(255,255,255,.8)", borderBottom: "1px solid rgba(255,255,255,.04)" },
  badge: (color: string) => ({ background: color, color: "#fff", borderRadius: "20px", padding: "3px 10px", fontSize: "11px", fontWeight: 600, display: "inline-block" }),
  actionBtn: (color: string) => ({ background: color, color: "#fff", border: "none", borderRadius: "6px", padding: "5px 12px", fontSize: "12px", cursor: "pointer", marginRight: "5px", fontWeight: 600 }),
  overlay: { position: "fixed" as const, inset: 0, background: "rgba(0,0,0,.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 },
  modal: { background: "#1a1d2e", border: "1px solid rgba(255,255,255,.1)", borderRadius: "18px", padding: "32px", width: "520px", maxHeight: "90vh", overflowY: "auto" as const },
  modalTitle: { fontSize: "18px", fontWeight: 700, marginBottom: "24px" },
  formGroup: { marginBottom: "16px" },
  label: { display: "block", fontSize: "12px", color: "rgba(255,255,255,.5)", marginBottom: "6px", textTransform: "uppercase" as const, letterSpacing: "0.4px" },
  input: { width: "100%", background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", borderRadius: "8px", padding: "10px 12px", color: "#fff", fontSize: "14px", outline: "none", boxSizing: "border-box" as const },
  row2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" },
  row3: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" },
  modalBtns: { display: "flex", gap: "10px", marginTop: "24px", justifyContent: "flex-end" },
  cancelBtn: { background: "rgba(255,255,255,.07)", color: "#fff", border: "none", borderRadius: "8px", padding: "10px 20px", fontSize: "14px", cursor: "pointer" },
};

const STATUS_COLORS: Record<string, string> = {
  paid: "rgba(34,197,94,.7)", pending: "rgba(234,179,8,.7)", overdue: "rgba(239,68,68,.8)"
};

function fmt(n: number) { return "Rs. " + n.toLocaleString("en-PK"); }

export default function FeeCollectionPage() {
  const { records, loading, create, update } = useBusinessRecords("fee_record");
  const [filterClass, setFilterClass] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterMonth, setFilterMonth] = useState("All");
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ student: "", class: "", month: "", amount: "", dueDate: "", status: "pending", paymentMethod: "Cash" });

  const fees = records.map(r => ({
    id: r.id,
    student: r.title,
    class: (r.data?.class as string) || "",
    month: (r.data?.month as string) || "",
    amount: r.amount || 0,
    dueDate: r.date || (r.data?.dueDate as string) || "",
    paidDate: (r.data?.paidDate as string) || undefined,
    status: r.status || "pending",
    paymentMethod: (r.data?.paymentMethod as string) || undefined,
  }));

  const collected = fees.filter(f => f.status === "paid").reduce((s, f) => s + f.amount, 0);
  const pending = fees.filter(f => f.status === "pending").reduce((s, f) => s + f.amount, 0);
  const overdue = fees.filter(f => f.status === "overdue").reduce((s, f) => s + f.amount, 0);
  const total = collected + pending + overdue;
  const rate = total > 0 ? Math.round((collected / total) * 100) : 0;

  const filtered = fees.filter(f => {
    const matchClass = filterClass === "All" || f.class === filterClass;
    const matchStatus = filterStatus === "All" || f.status === filterStatus;
    const matchMonth = filterMonth === "All" || f.month === filterMonth;
    return matchClass && matchStatus && matchMonth;
  });

  const today = new Date().toISOString().split("T")[0];

  async function markPaid(id: string) {
    await update(id, { status: "paid", data: { paidDate: today, paymentMethod: "Cash" } });
  }

  async function handleCreate() {
    if (!form.student.trim() || !form.class.trim() || !form.month.trim() || !form.dueDate) {
      setError("Student, class, month, and due date are required.");
      return;
    }
    if (Number(form.amount) <= 0) {
      setError("Amount must be greater than zero.");
      return;
    }
    if (fees.some(f => f.student.toLowerCase() === form.student.trim().toLowerCase() && f.class === form.class && f.month.toLowerCase() === form.month.trim().toLowerCase())) {
      setError("A fee record for this student and month already exists.");
      return;
    }
    await create({ title: form.student, status: form.status, date: form.dueDate, amount: Number(form.amount), data: { class: form.class, month: form.month, dueDate: form.dueDate, paymentMethod: form.paymentMethod } });
    setShowModal(false);
    setError("");
    setForm({ student: "", class: "", month: "", amount: "", dueDate: "", status: "pending", paymentMethod: "Cash" });
  }

  const classes = Array.from(new Set(fees.map(f => f.class)));
  const months = Array.from(new Set(fees.map(f => f.month)));

  return (
    <div style={S.page}>
      <div style={S.header}>
        <div>
          <h1 style={S.title}>Fee Collection</h1>
          <p style={S.sub}>Track and manage student fee payments and dues</p>
        </div>
        <button style={S.btn} onClick={() => setShowModal(true)}>+ Add Fee Record</button>
      </div>

      <div style={S.statsGrid}>
        {[
          { label: "Collected", value: fmt(collected), sub: `${fees.filter(f => f.status === "paid").length} records`, color: "#22c55e" },
          { label: "Pending", value: fmt(pending), sub: `${fees.filter(f => f.status === "pending").length} records`, color: "#f59e0b" },
          { label: "Overdue", value: fmt(overdue), sub: `${fees.filter(f => f.status === "overdue").length} records`, color: "#ef4444" },
          { label: "Collection Rate", value: rate + "%", sub: "This period", color: "#6366f1" },
        ].map(s => (
          <div key={s.label} style={S.statCard}>
            <div style={S.statLabel}>{s.label}</div>
            <div style={{ ...S.statValue, fontSize: "18px", color: s.color }}>{s.value}</div>
            <div style={S.statSub}>{s.sub}</div>
          </div>
        ))}
      </div>

      <div style={S.filters}>
        <select style={S.select} value={filterClass} onChange={e => setFilterClass(e.target.value)}>
          <option value="All">All Classes</option>
          {classes.map(c => <option key={c} value={c}>Class {c}</option>)}
        </select>
        <select style={S.select} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="All">All Status</option>
          <option value="paid">Paid</option><option value="pending">Pending</option><option value="overdue">Overdue</option>
        </select>
        <select style={S.select} value={filterMonth} onChange={e => setFilterMonth(e.target.value)}>
          <option value="All">All Months</option>
          {months.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <div style={{ marginLeft: "auto", fontSize: "13px", color: "rgba(255,255,255,.4)", alignSelf: "center" }}>
          Showing {filtered.length} of {fees.length} records
        </div>
      </div>

      {loading && <div style={{ textAlign: "center", padding: "40px", color: "rgba(255,255,255,.4)" }}>Loading...</div>}

      <div style={{ overflowX: "auto" as const }}>
        <table style={S.table}>
          <thead>
            <tr>
              {["Student", "Class", "Month", "Amount", "Due Date", "Paid Date", "Method", "Status", "Actions"].map(h => (
                <th key={h} style={S.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={9} style={{ ...S.td, textAlign: "center", color: "rgba(255,255,255,.25)", padding: "32px" }}>No fee records found.</td></tr>
            )}
            {filtered.map(f => (
              <tr key={f.id}>
                <td style={{ ...S.td, fontWeight: 600, color: "#fff" }}>{f.student}</td>
                <td style={S.td}>Class {f.class}</td>
                <td style={S.td}>{f.month}</td>
                <td style={{ ...S.td, fontWeight: 700 }}>{fmt(f.amount)}</td>
                <td style={S.td}>{f.dueDate}</td>
                <td style={S.td}>{f.paidDate || <span style={{ color: "rgba(255,255,255,.3)" }}>—</span>}</td>
                <td style={S.td}>{f.paymentMethod || <span style={{ color: "rgba(255,255,255,.3)" }}>—</span>}</td>
                <td style={S.td}><span style={S.badge(STATUS_COLORS[f.status] || "rgba(107,114,128,.7)")}>{f.status.toUpperCase()}</span></td>
                <td style={S.td}>
                  {f.status !== "paid"
                    ? <button style={S.actionBtn("rgba(34,197,94,.7)")} onClick={() => markPaid(f.id)}>Mark Paid</button>
                    : <button style={S.actionBtn("rgba(99,102,241,.6)")} onClick={() => toast.success("Receipt printed!")}>Receipt</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={S.overlay}>
          <div style={S.modal}>
            <div style={S.modalTitle}>Add Fee Record</div>
            <div style={S.formGroup}><label style={S.label}>Student Name</label><input style={S.input} value={form.student} onChange={e => setForm(f => ({ ...f, student: e.target.value }))} placeholder="Full name" /></div>
            <div style={S.row3}>
              <div style={S.formGroup}><label style={S.label}>Class</label><input style={S.input} value={form.class} onChange={e => setForm(f => ({ ...f, class: e.target.value }))} placeholder="6-10" /></div>
              <div style={S.formGroup}><label style={S.label}>Month</label><input style={S.input} value={form.month} onChange={e => setForm(f => ({ ...f, month: e.target.value }))} placeholder="March 2024" /></div>
              <div style={S.formGroup}><label style={S.label}>Amount (Rs.)</label><input style={S.input} type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0" /></div>
            </div>
            <div style={S.row2}>
              <div style={S.formGroup}><label style={S.label}>Due Date</label><input style={S.input} type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} /></div>
              <div style={S.formGroup}><label style={S.label}>Status</label>
                <select style={S.input} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                  <option value="pending">Pending</option><option value="paid">Paid</option><option value="overdue">Overdue</option>
                </select>
              </div>
            </div>
            <div style={S.formGroup}><label style={S.label}>Payment Method</label>
              <select style={S.input} value={form.paymentMethod} onChange={e => setForm(f => ({ ...f, paymentMethod: e.target.value }))}>
                <option value="Cash">Cash</option><option value="Bank Transfer">Bank Transfer</option>
                <option value="Easypaisa">Easypaisa</option><option value="JazzCash">JazzCash</option>
              </select>
            </div>
            {error && <div style={{ color: "#fda4af", fontSize: "12px", marginTop: "4px" }}>{error}</div>}
            <div style={S.modalBtns}>
              <button style={S.cancelBtn} onClick={() => { setShowModal(false); setError(""); }}>Cancel</button>
              <button style={S.btn} onClick={handleCreate}>Add Record</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
