"use client";

import { useMemo, useState } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";
import { mapCounterSaleRecords, mapDrugRecords, pharmacyBg, pharmacyBorder, pharmacyFont, pharmacyMuted, todayIso } from "../_shared";

const initialForm = { medicine: "", customer: "Walk-in", quantity: 1, amount: 0, paymentMethod: "cash", saleDate: todayIso() };

export default function PharmacyCounterSalesPage() {
  const saleStore = useBusinessRecords("pharmacy_sale");
  const inventoryStore = useBusinessRecords("drug");
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(initialForm);

  const sales = useMemo(() => mapCounterSaleRecords(saleStore.records), [saleStore.records]);
  const drugs = useMemo(() => mapDrugRecords(inventoryStore.records), [inventoryStore.records]);

  async function save() {
    const medicine = form.medicine.trim();
    if (!medicine || !form.saleDate) {
      setError("Medicine and sale date are required.");
      return;
    }
    if (form.quantity <= 0 || form.amount <= 0) {
      setError("Quantity and amount must be greater than zero.");
      return;
    }
    const matchedDrug = drugs.find((row) => row.name.toLowerCase() === medicine.toLowerCase());
    if (!matchedDrug) {
      setError("Selected medicine does not exist in inventory.");
      return;
    }
    if (matchedDrug.isExpired) {
      setError("Expired medicine cannot be sold.");
      return;
    }
    if (matchedDrug.stock < form.quantity) {
      setError("Sale quantity exceeds available stock.");
      return;
    }

    await saleStore.create({
      title: medicine,
      status: "completed",
      amount: form.amount,
      date: form.saleDate,
      data: { customer: form.customer.trim() || "Walk-in", quantity: form.quantity, paymentMethod: form.paymentMethod },
    });
    await inventoryStore.update(matchedDrug.id, { data: { stock: matchedDrug.stock - form.quantity } });
    setForm(initialForm);
    setError("");
    setShowModal(false);
  }

  return (
    <div style={{ minHeight: "100vh", padding: "28px 32px", color: "#fff", fontFamily: pharmacyFont }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: "0 0 6px", fontSize: 22, fontWeight: 800 }}>Counter Sales</h1>
          <p style={{ margin: 0, fontSize: 13, color: pharmacyMuted }}>Handle walk-in medicine sales with stock control.</p>
        </div>
        <button onClick={() => setShowModal(true)} style={{ padding: "10px 18px", borderRadius: 10, border: "none", background: "#60a5fa", color: "#fff", fontWeight: 700, cursor: "pointer" }}>Record Sale</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 12, marginBottom: 18 }}>
        {[
          { label: "Sales Count", value: sales.length, color: "#60a5fa" },
          { label: "Units Sold", value: sales.reduce((sum, row) => sum + row.quantity, 0), color: "#34d399" },
          { label: "Revenue", value: `Rs. ${sales.reduce((sum, row) => sum + row.amount, 0).toLocaleString()}`, color: "#f59e0b" },
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
            <tr>{["Medicine", "Customer", "Qty", "Amount", "Payment", "Date", "Status"].map((head) => (
              <th key={head} style={{ textAlign: "left", padding: "12px 16px", fontSize: 12, color: pharmacyMuted, borderBottom: `1px solid ${pharmacyBorder}` }}>{head}</th>
            ))}</tr>
          </thead>
          <tbody>
            {sales.map((row) => (
              <tr key={row.id}>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontWeight: 700 }}>{row.medicine}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>{row.customer}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>{row.quantity}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>Rs. {row.amount.toLocaleString()}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", textTransform: "capitalize" }}>{row.paymentMethod}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>{row.saleDate}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>{row.status}</td>
              </tr>
            ))}
            {!saleStore.loading && sales.length === 0 && <tr><td colSpan={7} style={{ padding: 32, textAlign: "center", color: "rgba(255,255,255,.28)" }}>No counter sales recorded yet.</td></tr>}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60 }}>
          <div style={{ width: 520, background: "#161b27", border: `1px solid ${pharmacyBorder}`, borderRadius: 16, padding: 28 }}>
            <h2 style={{ margin: "0 0 18px", fontSize: 18, fontWeight: 800 }}>Record Counter Sale</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {[
                ["Medicine", "medicine", "text"],
                ["Customer", "customer", "text"],
                ["Quantity", "quantity", "number"],
                ["Amount", "amount", "number"],
                ["Sale Date", "saleDate", "date"],
              ].map(([label, key, type]) => (
                <div key={key}>
                  <label style={{ display: "block", fontSize: 12, color: pharmacyMuted, marginBottom: 6 }}>{label}</label>
                  <input type={type} value={String((form as Record<string, unknown>)[key] ?? "")} onChange={(e) => setForm((prev) => ({ ...prev, [key]: type === "number" ? Number(e.target.value) : e.target.value }))} style={{ width: "100%", background: pharmacyBg, border: `1px solid ${pharmacyBorder}`, borderRadius: 8, padding: "10px 12px", color: "#fff", boxSizing: "border-box" }} />
                </div>
              ))}
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ display: "block", fontSize: 12, color: pharmacyMuted, marginBottom: 6 }}>Payment Method</label>
                <select value={form.paymentMethod} onChange={(e) => setForm((prev) => ({ ...prev, paymentMethod: e.target.value }))} style={{ width: "100%", background: "#161b27", border: `1px solid ${pharmacyBorder}`, borderRadius: 8, padding: "10px 12px", color: "#fff" }}>
                  {["cash", "card", "bank_transfer"].map((method) => <option key={method} value={method}>{method.replace("_", " ")}</option>)}
                </select>
              </div>
            </div>
            {error && <div style={{ marginTop: 12, color: "#fca5a5", fontSize: 12 }}>{error}</div>}
            <div style={{ display: "flex", gap: 12, marginTop: 18 }}>
              <button onClick={save} style={{ flex: 1, padding: "11px 0", borderRadius: 8, border: "none", background: "#60a5fa", color: "#fff", fontWeight: 700, cursor: "pointer" }}>Save Sale</button>
              <button onClick={() => { setShowModal(false); setError(""); }} style={{ padding: "11px 18px", borderRadius: 8, border: `1px solid ${pharmacyBorder}`, background: "transparent", color: "#fff", cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
