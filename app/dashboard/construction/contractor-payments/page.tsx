import toast from "react-hot-toast";
"use client";

import { useMemo, useState } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";
import {
  constructionBg,
  constructionBorder,
  constructionFont,
  constructionMuted,
  mapConstructionPayments,
  mapSubcontractors,
  todayIso,
} from "../_shared";

export default function ConstructionContractorPaymentsPage() {
  const paymentStore = useBusinessRecords("construction_payment");
  const subcontractorStore = useBusinessRecords("subcontractor");
  const { records, loading, create, update } = paymentStore;
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ subcontractor: "", amount: 0, date: todayIso(), reference: "" });

  const payments = useMemo(() => mapConstructionPayments(records), [records]);
  const subcontractors = useMemo(() => mapSubcontractors(subcontractorStore.records), [subcontractorStore.records]);

  async function save() {
    const subcontractor = subcontractors.find((row) => row.name === form.subcontractor);
    if (!subcontractor) {
      setError("Select a valid subcontractor.");
      return;
    }
    if (form.amount <= 0) {
      setError("Payment amount must be greater than zero.");
      return;
    }
    const scheduledAndReleased = payments
      .filter((row) => row.subcontractor === subcontractor.name && row.status !== "cleared")
      .reduce((sum, row) => sum + row.amount, 0);
    const exposure = subcontractor.contractValue - subcontractor.paid;
    if (form.amount + scheduledAndReleased > exposure) {
      setError("Payment exceeds outstanding subcontractor exposure.");
      return;
    }
    await create({
      title: subcontractor.name,
      status: "scheduled",
      amount: form.amount,
      date: form.date,
      data: {
        project: subcontractor.project,
        site: subcontractor.site,
        reference: form.reference.trim(),
      },
    });
    setShowModal(false);
    setError("");
    setForm({ subcontractor: "", amount: 0, date: todayIso(), reference: "" });
  }

  async function release(id: string, status: "released" | "cleared") {
    const row = payments.find((entry) => entry.id === id);
    if (!row) return;
    if (status === "cleared" && row.status !== "released") {
      toast.success("Only released payments can be cleared.");
      return;
    }
    await update(id, { status });
  }

  return (
    <div style={{ minHeight: "100vh", padding: "28px 32px", color: "#fff", fontFamily: constructionFont }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: "0 0 6px", fontSize: 24, fontWeight: 800 }}>Contractor Payments</h1>
          <p style={{ margin: 0, fontSize: 13, color: constructionMuted }}>Schedule, release, and clear subcontractor payments against open contracts.</p>
        </div>
        <button onClick={() => setShowModal(true)} style={{ padding: "10px 18px", borderRadius: 10, border: "none", background: "#f97316", color: "#fff", fontWeight: 700, cursor: "pointer" }}>Schedule Payment</button>
      </div>

      <div style={{ background: constructionBg, border: `1px solid ${constructionBorder}`, borderRadius: 14, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>{["Subcontractor", "Project", "Site", "Reference", "Amount", "Date", "Status", "Action"].map((head) => (
              <th key={head} style={{ textAlign: "left", padding: "12px 16px", borderBottom: `1px solid ${constructionBorder}`, fontSize: 12, color: constructionMuted }}>{head}</th>
            ))}</tr>
          </thead>
          <tbody>
            {payments.map((row) => (
              <tr key={row.id}>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontWeight: 700 }}>{row.subcontractor}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>{row.project}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>{row.site}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>{row.reference || "—"}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", color: "#34d399" }}>Rs. {row.amount.toLocaleString()}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>{row.date}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>{row.status}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {row.status === "scheduled" && <button onClick={() => release(row.id, "released")} style={{ padding: "5px 10px", borderRadius: 6, background: "rgba(129,140,248,.15)", border: "1px solid rgba(129,140,248,.3)", color: "#a5b4fc", cursor: "pointer" }}>Release</button>}
                    {row.status === "released" && <button onClick={() => release(row.id, "cleared")} style={{ padding: "5px 10px", borderRadius: 6, background: "rgba(52,211,153,.15)", border: "1px solid rgba(52,211,153,.3)", color: "#34d399", cursor: "pointer" }}>Clear</button>}
                  </div>
                </td>
              </tr>
            ))}
            {!loading && payments.length === 0 && <tr><td colSpan={8} style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,.25)" }}>No contractor payments yet.</td></tr>}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.72)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 560, background: "#161b27", border: `1px solid ${constructionBorder}`, borderRadius: 16, padding: 28 }}>
            <h2 style={{ margin: "0 0 18px", fontSize: 18, fontWeight: 800 }}>Schedule Contractor Payment</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ display: "block", marginBottom: 6, fontSize: 12, color: constructionMuted }}>Subcontractor</label>
                <select value={form.subcontractor} onChange={(e) => setForm((prev) => ({ ...prev, subcontractor: e.target.value }))} style={{ width: "100%", padding: "10px 12px", background: "#111827", border: `1px solid ${constructionBorder}`, borderRadius: 8, color: "#fff" }}>
                  <option value="">Select subcontractor</option>
                  {subcontractors.map((row) => <option key={row.id} value={row.name}>{row.name} · {row.project}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: "block", marginBottom: 6, fontSize: 12, color: constructionMuted }}>Amount</label>
                <input type="number" value={form.amount} onChange={(e) => setForm((prev) => ({ ...prev, amount: Number(e.target.value) }))} style={{ width: "100%", padding: "10px 12px", background: "#111827", border: `1px solid ${constructionBorder}`, borderRadius: 8, color: "#fff" }} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: 6, fontSize: 12, color: constructionMuted }}>Date</label>
                <input type="date" value={form.date} onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))} style={{ width: "100%", padding: "10px 12px", background: "#111827", border: `1px solid ${constructionBorder}`, borderRadius: 8, color: "#fff" }} />
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ display: "block", marginBottom: 6, fontSize: 12, color: constructionMuted }}>Reference</label>
                <input value={form.reference} onChange={(e) => setForm((prev) => ({ ...prev, reference: e.target.value }))} style={{ width: "100%", padding: "10px 12px", background: "#111827", border: `1px solid ${constructionBorder}`, borderRadius: 8, color: "#fff" }} />
              </div>
            </div>
            {error && <div style={{ marginTop: 12, color: "#fda4af", fontSize: 12 }}>{error}</div>}
            <div style={{ display: "flex", gap: 12, marginTop: 18 }}>
              <button onClick={save} style={{ flex: 1, padding: "11px 0", borderRadius: 8, border: "none", background: "#f97316", color: "#fff", fontWeight: 700, cursor: "pointer" }}>Save</button>
              <button onClick={() => { setShowModal(false); setError(""); }} style={{ padding: "11px 18px", borderRadius: 8, border: `1px solid ${constructionBorder}`, background: "transparent", color: "#cbd5e1", cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
