"use client";
import { useState } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";

const ff = "'Outfit','Inter',sans-serif";
const bg = "rgba(255,255,255,0.03)";
const border = "rgba(255,255,255,0.07)";
const card: React.CSSProperties = { background: bg, border: `1px solid ${border}`, borderRadius: 12, padding: "20px 24px", fontFamily: ff };

export default function RentPage() {
  const { records, loading, create, update } = useBusinessRecords("rent_payment");
  const leaseStore = useBusinessRecords("lease");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ tenant: "", property: "", amount: 0, month: "", dueDate: "", notes: "" });
  const [formError, setFormError] = useState("");

  const payments = records.map(r => ({
    id: r.id,
    tenant: r.title,
    property: (r.data?.property as string) || "",
    amount: r.amount || 0,
    month: (r.data?.month as string) || "",
    dueDate: r.date?.split("T")[0] || "",
    notes: (r.data?.notes as string) || "",
    status: r.status || "pending",
  }));

  const collected = payments.filter(p => p.status === "paid").reduce((a, p) => a + p.amount, 0);
  const pending = payments.filter(p => p.status === "pending").reduce((a, p) => a + p.amount, 0);

  async function save() {
    if (!form.tenant.trim()) return setFormError("Tenant is required.");
    if (!form.property.trim()) return setFormError("Property is required.");
    if (!form.month.trim()) return setFormError("Billing month is required.");
    if (!form.dueDate) return setFormError("Due date is required.");
    if (form.amount <= 0) return setFormError("Amount must be greater than zero.");
    const activeLease = leaseStore.records.some(record => record.title.toLowerCase() === form.tenant.trim().toLowerCase() && String(record.data?.property || "").toLowerCase() === form.property.trim().toLowerCase() && String(record.status || "") === "active");
    if (!activeLease) return setFormError("Active lease not found for this tenant and property.");
    const duplicateMonth = payments.some(payment => payment.tenant.toLowerCase() === form.tenant.trim().toLowerCase() && payment.property.toLowerCase() === form.property.trim().toLowerCase() && payment.month.toLowerCase() === form.month.trim().toLowerCase());
    if (duplicateMonth) return setFormError("A rent record already exists for this month.");
    setFormError("");
    await create({ title: form.tenant.trim(), status: "pending", amount: form.amount, date: form.dueDate, data: { property: form.property.trim(), month: form.month.trim(), notes: form.notes.trim() } });
    setShowModal(false);
    setForm({ tenant: "", property: "", amount: 0, month: "", dueDate: "", notes: "" });
  }

  async function markPaid(paymentId: string) {
    const payment = payments.find(entry => entry.id === paymentId);
    if (!payment || payment.status === "paid") return;
    await update(paymentId, { status: "paid" });
  }

  return (
    <div style={{ padding: "28px 32px", fontFamily: ff, color: "#fff", minHeight: "100vh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <div><h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>💰 Rent Collection</h1><p style={{ fontSize: 13, color: "rgba(255,255,255,.4)", margin: 0 }}>Track monthly rent payments</p></div>
        <button onClick={() => { setFormError(""); setShowModal(true); }} style={{ padding: "10px 22px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#818cf8,#6366f1)", color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>+ Add Payment</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 28 }}>
        {[{ label: "Total Records", val: payments.length, color: "#818cf8" }, { label: "Collected", val: `Rs. ${collected.toLocaleString()}`, color: "#34d399" }, { label: "Pending", val: `Rs. ${pending.toLocaleString()}`, color: "#f87171" }, { label: "Overdue", val: payments.filter(p => p.status === "overdue").length, color: "#f59e0b" }].map(s => (
          <div key={s.label} style={card}><div style={{ fontSize: 13, color: "rgba(255,255,255,.5)", marginBottom: 6 }}>{s.label}</div><div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.val}</div></div>
        ))}
      </div>

      {loading && <div style={{ textAlign: "center", padding: 40, color: "rgba(255,255,255,0.4)" }}>Loading...</div>}

      <div style={card}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr>{["Tenant", "Property", "Month", "Amount", "Due Date", "Status", "Action"].map(h => (
            <th key={h} style={{ textAlign: "left", padding: "12px 16px", fontSize: 12, color: "rgba(255,255,255,.5)", borderBottom: `1px solid ${border}`, fontWeight: 600 }}>{h}</th>
          ))}</tr></thead>
          <tbody>
            {payments.map(p => (
              <tr key={p.id}>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontWeight: 600 }}>{p.tenant}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontSize: 13 }}>{p.property}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontSize: 13 }}>{p.month}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", color: "#34d399", fontWeight: 600 }}>Rs. {p.amount.toLocaleString()}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontSize: 12, color: "rgba(255,255,255,.5)" }}>{p.dueDate}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>
                  <span style={{ display: "inline-block", background: p.status === "paid" ? "#34d39920" : p.status === "overdue" ? "#ef444420" : "#f59e0b20", color: p.status === "paid" ? "#34d399" : p.status === "overdue" ? "#ef4444" : "#f59e0b", borderRadius: 6, padding: "2px 10px", fontSize: 12, fontWeight: 600 }}>{p.status}</span>
                </td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>
                  {p.status !== "paid" && <button onClick={() => void markPaid(p.id)} style={{ padding: "5px 10px", background: "#34d39920", border: "1px solid rgba(52,211,153,.3)", color: "#34d399", borderRadius: 6, fontSize: 12, cursor: "pointer" }}>Mark Paid</button>}
                </td>
              </tr>
            ))}
            {!loading && payments.length === 0 && <tr><td colSpan={7} style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,.25)" }}>No payments recorded yet.</td></tr>}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#161b27", border: `1px solid ${border}`, borderRadius: 16, padding: 32, width: 480, fontFamily: ff }}>
            <h2 style={{ margin: "0 0 24px", fontSize: 20, fontWeight: 700 }}>Add Rent Record</h2>
            {formError && <div style={{ marginBottom: 14, padding: "10px 12px", background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.26)", borderRadius: 8, color: "#fca5a5", fontSize: 12 }}>{formError}</div>}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {[["Tenant Name", "tenant", "text"], ["Property", "property", "text"], ["Month (e.g. March 2026)", "month", "text"], ["Due Date", "dueDate", "date"]].map(([label, key, type]) => (
                <div key={key}>
                  <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>{label}</label>
                  <input type={type} value={String((form as Record<string, unknown>)[key] ?? "")} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    style={{ width: "100%", background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff", fontSize: 14, boxSizing: "border-box" }} />
                </div>
              ))}
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Amount (Rs.)</label>
                <input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: Number(e.target.value) }))} style={{ width: "100%", background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff", fontSize: 14, boxSizing: "border-box" }} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
              <button onClick={save} style={{ flex: 1, padding: "11px 0", background: "linear-gradient(135deg,#818cf8,#6366f1)", border: "none", borderRadius: 8, color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Save</button>
              <button onClick={() => setShowModal(false)} style={{ padding: "11px 24px", background: "transparent", border: `1px solid ${border}`, borderRadius: 8, color: "rgba(255,255,255,.6)", fontSize: 14, cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
