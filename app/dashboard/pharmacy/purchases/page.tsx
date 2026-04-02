"use client";

import { useMemo, useState } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";
import { mapPurchaseRecords, pharmacyBg, pharmacyBorder, pharmacyFont, pharmacyMuted, todayIso } from "../_shared";

const initialForm = { medicine: "", supplier: "", batchNo: "", quantity: 0, unitCost: 0, receivedDate: todayIso() };

export default function PharmacyPurchasesPage() {
  const { records, loading, create } = useBusinessRecords("pharmacy_purchase");
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(initialForm);

  const purchases = useMemo(() => mapPurchaseRecords(records), [records]);

  async function save() {
    const medicine = form.medicine.trim();
    const supplier = form.supplier.trim();
    if (!medicine || !supplier || !form.batchNo.trim() || !form.receivedDate) {
      setError("Medicine, supplier, batch no, and received date are required.");
      return;
    }
    if (form.quantity <= 0 || form.unitCost <= 0) {
      setError("Quantity and unit cost must be greater than zero.");
      return;
    }
    await create({
      title: medicine,
      status: "received",
      amount: form.unitCost,
      date: form.receivedDate,
      data: { supplier, batchNo: form.batchNo.trim(), quantity: form.quantity, totalCost: form.quantity * form.unitCost },
    });
    setForm(initialForm);
    setError("");
    setShowModal(false);
  }

  return (
    <div style={{ minHeight: "100vh", padding: "28px 32px", color: "#fff", fontFamily: pharmacyFont }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: "0 0 6px", fontSize: 22, fontWeight: 800 }}>Medicine Purchases</h1>
          <p style={{ margin: 0, fontSize: 13, color: pharmacyMuted }}>Record supplier receipts and purchase cost lines.</p>
        </div>
        <button onClick={() => setShowModal(true)} style={{ padding: "10px 18px", borderRadius: 10, border: "none", background: "#22c55e", color: "#fff", fontWeight: 700, cursor: "pointer" }}>Add Purchase</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 12, marginBottom: 18 }}>
        {[
          { label: "Purchase Lines", value: purchases.length, color: "#60a5fa" },
          { label: "Units Received", value: purchases.reduce((sum, row) => sum + row.quantity, 0), color: "#22c55e" },
          { label: "Purchase Value", value: `Rs. ${purchases.reduce((sum, row) => sum + row.totalCost, 0).toLocaleString()}`, color: "#f59e0b" },
        ].map((card) => (
          <div key={card.label} style={{ background: pharmacyBg, border: `1px solid ${pharmacyBorder}`, borderRadius: 14, padding: "18px 20px" }}>
            <div style={{ fontSize: 12, color: pharmacyMuted, marginBottom: 8 }}>{card.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      <div style={{ background: pharmacyBg, border: `1px solid ${pharmacyBorder}`, borderRadius: 14, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>{["Medicine", "Supplier", "Batch", "Qty", "Unit Cost", "Total", "Received", "Status"].map((head) => (
              <th key={head} style={{ textAlign: "left", padding: "12px 16px", fontSize: 12, color: pharmacyMuted, borderBottom: `1px solid ${pharmacyBorder}` }}>{head}</th>
            ))}</tr>
          </thead>
          <tbody>
            {purchases.map((row) => (
              <tr key={row.id}>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontWeight: 700 }}>{row.medicine}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>{row.supplier}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>{row.batchNo}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>{row.quantity}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>Rs. {row.unitCost.toLocaleString()}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>Rs. {row.totalCost.toLocaleString()}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>{row.receivedDate}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>{row.status}</td>
              </tr>
            ))}
            {!loading && purchases.length === 0 && <tr><td colSpan={8} style={{ padding: 32, textAlign: "center", color: "rgba(255,255,255,.28)" }}>No purchase entries yet.</td></tr>}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60 }}>
          <div style={{ width: 520, background: "#161b27", border: `1px solid ${pharmacyBorder}`, borderRadius: 16, padding: 28 }}>
            <h2 style={{ margin: "0 0 18px", fontSize: 18, fontWeight: 800 }}>Add Purchase</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {[
                ["Medicine", "medicine", "text"],
                ["Supplier", "supplier", "text"],
                ["Batch No.", "batchNo", "text"],
                ["Quantity", "quantity", "number"],
                ["Unit Cost", "unitCost", "number"],
                ["Received Date", "receivedDate", "date"],
              ].map(([label, key, type]) => (
                <div key={key}>
                  <label style={{ display: "block", fontSize: 12, color: pharmacyMuted, marginBottom: 6 }}>{label}</label>
                  <input type={type} value={String((form as Record<string, unknown>)[key] ?? "")} onChange={(e) => setForm((prev) => ({ ...prev, [key]: type === "number" ? Number(e.target.value) : e.target.value }))} style={{ width: "100%", background: pharmacyBg, border: `1px solid ${pharmacyBorder}`, borderRadius: 8, padding: "10px 12px", color: "#fff", boxSizing: "border-box" }} />
                </div>
              ))}
            </div>
            {error && <div style={{ marginTop: 12, color: "#fca5a5", fontSize: 12 }}>{error}</div>}
            <div style={{ display: "flex", gap: 12, marginTop: 18 }}>
              <button onClick={save} style={{ flex: 1, padding: "11px 0", borderRadius: 8, border: "none", background: "#22c55e", color: "#fff", fontWeight: 700, cursor: "pointer" }}>Save Purchase</button>
              <button onClick={() => { setShowModal(false); setError(""); }} style={{ padding: "11px 18px", borderRadius: 8, border: `1px solid ${pharmacyBorder}`, background: "transparent", color: "#fff", cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
