"use client";

import { useMemo, useState } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";
import { mapBatchRecords, pharmacyBg, pharmacyBorder, pharmacyFont, pharmacyMuted, todayIso } from "../_shared";

const initialForm = { medicine: "", batchNo: "", supplier: "", quantity: 0, costPerUnit: 0, expiryDate: "", receivedDate: todayIso() };

export default function PharmacyBatchesPage() {
  const { records, loading, create, update } = useBusinessRecords("drug_batch");
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(initialForm);

  const batches = useMemo(() => mapBatchRecords(records), [records]);

  async function save() {
    const medicine = form.medicine.trim();
    const batchNo = form.batchNo.trim();
    if (!medicine || !batchNo || !form.expiryDate || !form.receivedDate) {
      setError("Medicine, batch no, received date, and expiry date are required.");
      return;
    }
    if (form.quantity <= 0 || form.costPerUnit <= 0) {
      setError("Quantity and cost per unit must be greater than zero.");
      return;
    }
    const duplicate = batches.some((row) => row.status === "active" && row.medicine.toLowerCase() === medicine.toLowerCase() && row.batchNo.toLowerCase() === batchNo.toLowerCase());
    if (duplicate) {
      setError("This active batch already exists.");
      return;
    }
    await create({
      title: medicine,
      status: "active",
      amount: form.costPerUnit,
      date: form.receivedDate,
      data: { batchNo, supplier: form.supplier.trim(), quantity: form.quantity, expiryDate: form.expiryDate },
    });
    setForm(initialForm);
    setError("");
    setShowModal(false);
  }

  return (
    <div style={{ minHeight: "100vh", padding: "28px 32px", color: "#fff", fontFamily: pharmacyFont }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: "0 0 6px", fontSize: 22, fontWeight: 800 }}>Batch Control</h1>
          <p style={{ margin: 0, fontSize: 13, color: pharmacyMuted }}>Track medicine batches, receipt dates, and expiry risk.</p>
        </div>
        <button onClick={() => setShowModal(true)} style={{ padding: "10px 18px", borderRadius: 10, border: "none", background: "#fb7185", color: "#fff", fontWeight: 700, cursor: "pointer" }}>Add Batch</button>
      </div>

      <div style={{ background: pharmacyBg, border: `1px solid ${pharmacyBorder}`, borderRadius: 14, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>{["Medicine", "Batch", "Supplier", "Qty", "Cost / Unit", "Received", "Expiry", "Status", "Action"].map((head) => (
              <th key={head} style={{ textAlign: "left", padding: "12px 16px", fontSize: 12, color: pharmacyMuted, borderBottom: `1px solid ${pharmacyBorder}` }}>{head}</th>
            ))}</tr>
          </thead>
          <tbody>
            {batches.map((row) => (
              <tr key={row.id}>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontWeight: 700 }}>{row.medicine}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>{row.batchNo}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", color: pharmacyMuted }}>{row.supplier || "-"}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>{row.quantity}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>Rs. {row.costPerUnit.toLocaleString()}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>{row.receivedDate}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>{row.expiryDate}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>{row.status}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>
                  {row.status === "active" && <button onClick={() => update(row.id, { status: "closed" })} style={{ padding: "5px 10px", background: "rgba(248,113,113,.14)", border: "1px solid rgba(248,113,113,.28)", color: "#f87171", borderRadius: 6, fontSize: 11, cursor: "pointer" }}>Close</button>}
                </td>
              </tr>
            ))}
            {!loading && batches.length === 0 && <tr><td colSpan={9} style={{ padding: 32, textAlign: "center", color: "rgba(255,255,255,.28)" }}>No batches available.</td></tr>}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60 }}>
          <div style={{ width: 560, background: "#161b27", border: `1px solid ${pharmacyBorder}`, borderRadius: 16, padding: 28 }}>
            <h2 style={{ margin: "0 0 18px", fontSize: 18, fontWeight: 800 }}>Add Batch</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {[
                ["Medicine", "medicine", "text"],
                ["Batch No.", "batchNo", "text"],
                ["Supplier", "supplier", "text"],
                ["Expiry Date", "expiryDate", "date"],
                ["Quantity", "quantity", "number"],
                ["Cost / Unit", "costPerUnit", "number"],
                ["Received Date", "receivedDate", "date"],
              ].map(([label, key, type]) => (
                <div key={key} style={{ gridColumn: key === "receivedDate" ? "span 2" : undefined }}>
                  <label style={{ display: "block", fontSize: 12, color: pharmacyMuted, marginBottom: 6 }}>{label}</label>
                  <input type={type} value={String((form as Record<string, unknown>)[key] ?? "")} onChange={(e) => setForm((prev) => ({ ...prev, [key]: type === "number" ? Number(e.target.value) : e.target.value }))} style={{ width: "100%", background: pharmacyBg, border: `1px solid ${pharmacyBorder}`, borderRadius: 8, padding: "10px 12px", color: "#fff", boxSizing: "border-box" }} />
                </div>
              ))}
            </div>
            {error && <div style={{ marginTop: 12, color: "#fca5a5", fontSize: 12 }}>{error}</div>}
            <div style={{ display: "flex", gap: 12, marginTop: 18 }}>
              <button onClick={save} style={{ flex: 1, padding: "11px 0", borderRadius: 8, border: "none", background: "#fb7185", color: "#fff", fontWeight: 700, cursor: "pointer" }}>Save Batch</button>
              <button onClick={() => { setShowModal(false); setError(""); }} style={{ padding: "11px 18px", borderRadius: 8, border: `1px solid ${pharmacyBorder}`, background: "transparent", color: "#fff", cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
