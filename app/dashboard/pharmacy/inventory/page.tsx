"use client";

import { useMemo, useState } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";
import { mapDrugRecords, pharmacyBg, pharmacyBorder, pharmacyFont, pharmacyMuted } from "../_shared";

const initialForm = { name: "", category: "Tablet", manufacturer: "", batchNo: "", stock: 0, minStock: 20, unitPrice: 0, expiryDate: "" };

export default function PharmacyInventoryPage() {
  const { records, loading, create } = useBusinessRecords("drug");
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(initialForm);

  const drugs = useMemo(() => mapDrugRecords(records), [records]);

  const lowStock = drugs.filter((d) => d.isLow).length;
  const expired = drugs.filter((d) => d.isExpired).length;
  const totalValue = drugs.reduce((a, d) => a + d.stock * d.unitPrice, 0);

  async function save() {
    const name = form.name.trim();
    const batchNo = form.batchNo.trim();
    if (!name || !batchNo || !form.expiryDate) {
      setError("Drug name, batch no, and expiry date are required.");
      return;
    }
    if (form.stock < 0 || form.minStock < 0 || form.unitPrice <= 0) {
      setError("Stock and min stock cannot be negative, and unit price must be greater than zero.");
      return;
    }
    const duplicate = drugs.some((row) => row.name.toLowerCase() === name.toLowerCase() && row.batchNo.toLowerCase() === batchNo.toLowerCase() && row.status !== "expired");
    if (duplicate) {
      setError("This drug and batch already exist.");
      return;
    }
    await create({
      title: name,
      status: "in_stock",
      amount: form.unitPrice,
      data: { category: form.category, manufacturer: form.manufacturer.trim(), batchNo, stock: form.stock, minStock: form.minStock, expiryDate: form.expiryDate },
    });
    setShowModal(false);
    setError("");
    setForm(initialForm);
  }

  return (
    <div style={{ padding: "28px 32px", fontFamily: pharmacyFont, color: "#fff", minHeight: "100vh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>Drug Inventory</h1>
          <p style={{ fontSize: 13, color: pharmacyMuted, margin: 0 }}>Track pharmaceutical stock and medicine lines.</p>
        </div>
        <button onClick={() => setShowModal(true)} style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: "#fb7185", color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Add Drug</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 28 }}>
        {[{ label: "Total Drugs", val: drugs.length, color: "#fb7185" }, { label: "Low Stock", val: lowStock, color: "#ef4444" }, { label: "Expired", val: expired, color: "#f59e0b" }, { label: "Inventory Value", val: `Rs. ${totalValue.toLocaleString()}`, color: "#34d399" }].map((s) => (
          <div key={s.label} style={{ background: pharmacyBg, border: `1px solid ${pharmacyBorder}`, borderRadius: 12, padding: "20px 24px" }}>
            <div style={{ fontSize: 13, color: pharmacyMuted, marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.val}</div>
          </div>
        ))}
      </div>

      {loading && <div style={{ textAlign: "center", padding: 40, color: pharmacyMuted }}>Loading...</div>}

      <div style={{ background: pharmacyBg, border: `1px solid ${pharmacyBorder}`, borderRadius: 12 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr>{["Drug Name", "Category", "Manufacturer", "Batch", "Stock", "Min Stock", "Unit Price", "Expiry", "Status"].map((h) => (
            <th key={h} style={{ textAlign: "left", padding: "12px 16px", fontSize: 12, color: pharmacyMuted, borderBottom: `1px solid ${pharmacyBorder}`, fontWeight: 600 }}>{h}</th>
          ))}</tr></thead>
          <tbody>
            {drugs.map((d) => (
              <tr key={d.id} style={{ opacity: d.isExpired ? 0.6 : 1 }}>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontWeight: 600 }}>{d.name}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontSize: 13 }}>{d.category}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontSize: 13, color: pharmacyMuted }}>{d.manufacturer || "-"}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontSize: 12, color: pharmacyMuted }}>{d.batchNo}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", color: d.isLow ? "#ef4444" : "#fff", fontWeight: d.isLow ? 700 : 400 }}>{d.stock}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontSize: 13, color: pharmacyMuted }}>{d.minStock}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>Rs. {d.unitPrice.toLocaleString()}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontSize: 12, color: d.isExpired ? "#ef4444" : pharmacyMuted }}>{d.expiryDate}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>
                  {d.isExpired ? <span style={{ display: "inline-block", background: "rgba(245,158,11,.15)", color: "#f59e0b", borderRadius: 6, padding: "2px 8px", fontSize: 10, fontWeight: 600 }}>Expired</span> :
                   d.isLow ? <span style={{ display: "inline-block", background: "rgba(239,68,68,.15)", color: "#ef4444", borderRadius: 6, padding: "2px 8px", fontSize: 10, fontWeight: 600 }}>Low Stock</span> :
                   <span style={{ display: "inline-block", background: "rgba(52,211,153,.15)", color: "#34d399", borderRadius: 6, padding: "2px 8px", fontSize: 10, fontWeight: 600 }}>OK</span>}
                </td>
              </tr>
            ))}
            {!loading && drugs.length === 0 && <tr><td colSpan={9} style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,.25)" }}>No drugs in inventory.</td></tr>}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#161b27", border: `1px solid ${pharmacyBorder}`, borderRadius: 16, padding: 32, width: 520, fontFamily: pharmacyFont }}>
            <h2 style={{ margin: "0 0 24px", fontSize: 18, fontWeight: 700 }}>Add Drug</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {[["Drug Name", "name", "text", "span 2"], ["Manufacturer", "manufacturer", "text", ""], ["Batch No.", "batchNo", "text", ""], ["Expiry Date", "expiryDate", "date", "span 2"]].map(([label, key, type, col]) => (
                <div key={key} style={{ gridColumn: col || undefined }}>
                  <label style={{ display: "block", fontSize: 12, color: pharmacyMuted, marginBottom: 6 }}>{label}</label>
                  <input type={type} value={String((form as Record<string, unknown>)[key] ?? "")} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} style={{ width: "100%", background: pharmacyBg, border: `1px solid ${pharmacyBorder}`, borderRadius: 8, padding: "9px 12px", color: "#fff", fontSize: 14, boxSizing: "border-box" }} />
                </div>
              ))}
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ display: "block", fontSize: 12, color: pharmacyMuted, marginBottom: 6 }}>Category</label>
                <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} style={{ width: "100%", background: "#161b27", border: `1px solid ${pharmacyBorder}`, borderRadius: 8, padding: "9px 12px", color: "#fff", fontSize: 14 }}>
                  {["Tablet", "Capsule", "Syrup", "Injection", "Cream", "Drops", "Inhaler", "Other"].map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: pharmacyMuted, marginBottom: 6 }}>Stock (units)</label>
                <input type="number" value={form.stock} onChange={(e) => setForm((f) => ({ ...f, stock: Number(e.target.value) }))} style={{ width: "100%", background: pharmacyBg, border: `1px solid ${pharmacyBorder}`, borderRadius: 8, padding: "9px 12px", color: "#fff", fontSize: 14, boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: pharmacyMuted, marginBottom: 6 }}>Min Stock</label>
                <input type="number" value={form.minStock} onChange={(e) => setForm((f) => ({ ...f, minStock: Number(e.target.value) }))} style={{ width: "100%", background: pharmacyBg, border: `1px solid ${pharmacyBorder}`, borderRadius: 8, padding: "9px 12px", color: "#fff", fontSize: 14, boxSizing: "border-box" }} />
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ display: "block", fontSize: 12, color: pharmacyMuted, marginBottom: 6 }}>Unit Price (Rs.)</label>
                <input type="number" value={form.unitPrice} onChange={(e) => setForm((f) => ({ ...f, unitPrice: Number(e.target.value) }))} style={{ width: "100%", background: pharmacyBg, border: `1px solid ${pharmacyBorder}`, borderRadius: 8, padding: "9px 12px", color: "#fff", fontSize: 14, boxSizing: "border-box" }} />
              </div>
            </div>
            {error && <div style={{ marginTop: 14, fontSize: 12, color: "#fca5a5" }}>{error}</div>}
            <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
              <button onClick={save} style={{ flex: 1, padding: "11px 0", background: "#fb7185", border: "none", borderRadius: 8, color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Add Drug</button>
              <button onClick={() => { setShowModal(false); setError(""); }} style={{ padding: "11px 24px", background: "transparent", border: `1px solid ${pharmacyBorder}`, borderRadius: 8, color: "rgba(255,255,255,.6)", fontSize: 14, cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
