"use client";

import toast from "react-hot-toast";
import { useState } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";

const ff = "'Outfit','Inter',sans-serif";
const bg = "rgba(255,255,255,.03)";
const border = "rgba(255,255,255,.07)";

export default function HarvestPage() {
  const { records, loading, create } = useBusinessRecords("harvest");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ crop: "", field: "", quantity: 0, unit: "kg", salePrice: 0, date: "", buyer: "" });

  const harvests = records.map(r => ({
    id: r.id,
    crop: r.title,
    field: (r.data?.field as string) || "",
    quantity: Number(r.data?.quantity) || 0,
    unit: (r.data?.unit as string) || "kg",
    salePrice: r.amount || 0,
    date: r.date?.split("T")[0] || "",
    buyer: (r.data?.buyer as string) || "",
    revenue: (Number(r.data?.quantity) || 0) * (r.amount || 0),
  }));

  const totalRevenue = harvests.reduce((a, h) => a + h.revenue, 0);
  const totalQuantity = harvests.reduce((a, h) => a + h.quantity, 0);

  async function save() {
    const crop = form.crop.trim();
    const field = form.field.trim();
    if (!crop || !field || !form.date || form.quantity <= 0 || form.salePrice <= 0) {
      toast.error("Crop, field, date, quantity, aur sale price required hain.");
      return;
    }
    if (harvests.some(h => h.crop.trim().toLowerCase() === crop.toLowerCase() && h.field.trim().toLowerCase() === field.toLowerCase() && h.date === form.date)) {
      toast.error("Is crop aur field ka harvest is date par already recorded hai.");
      return;
    }
    await create({ title: form.crop, status: "sold", amount: form.salePrice, date: form.date, data: { field: form.field, quantity: form.quantity, unit: form.unit, buyer: form.buyer } });
    setShowModal(false);
    setForm({ crop: "", field: "", quantity: 0, unit: "kg", salePrice: 0, date: "", buyer: "" });
  }

  return (
    <div style={{ padding: "28px 32px", fontFamily: ff, color: "#fff", minHeight: "100vh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <div><h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>🌻 Harvest Records</h1><p style={{ fontSize: 13, color: "rgba(255,255,255,.4)", margin: 0 }}>Track harvest yields and sales</p></div>
        <button onClick={() => setShowModal(true)} style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: "#34d399", color: "#0f1117", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>+ Add Harvest</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 28 }}>
        {[{ label: "Total Harvests", val: harvests.length, color: "#34d399" }, { label: "Total Quantity", val: `${totalQuantity.toLocaleString()} kg`, color: "#f59e0b" }, { label: "Total Revenue", val: `Rs. ${totalRevenue.toLocaleString()}`, color: "#818cf8" }].map(s => (
          <div key={s.label} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 12, padding: "20px 24px" }}><div style={{ fontSize: 13, color: "rgba(255,255,255,.5)", marginBottom: 6 }}>{s.label}</div><div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.val}</div></div>
        ))}
      </div>

      {loading && <div style={{ textAlign: "center", padding: 40, color: "rgba(255,255,255,0.4)" }}>Loading...</div>}

      <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 12 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr>{["Crop", "Field", "Date", "Quantity", "Sale Price/Unit", "Revenue", "Buyer"].map(h => (
            <th key={h} style={{ textAlign: "left", padding: "12px 16px", fontSize: 12, color: "rgba(255,255,255,.5)", borderBottom: `1px solid ${border}`, fontWeight: 600 }}>{h}</th>
          ))}</tr></thead>
          <tbody>
            {harvests.map(h => (
              <tr key={h.id}>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontWeight: 600 }}>{h.crop}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontSize: 13 }}>{h.field}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontSize: 12 }}>{h.date}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontWeight: 600 }}>{h.quantity} {h.unit}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>Rs. {h.salePrice.toLocaleString()}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", color: "#34d399", fontWeight: 600 }}>Rs. {h.revenue.toLocaleString()}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontSize: 13, color: "rgba(255,255,255,.5)" }}>{h.buyer}</td>
              </tr>
            ))}
            {!loading && harvests.length === 0 && <tr><td colSpan={7} style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,.25)" }}>No harvest records yet.</td></tr>}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#161b27", border: `1px solid ${border}`, borderRadius: 16, padding: 32, width: 480, fontFamily: ff }}>
            <h2 style={{ margin: "0 0 24px", fontSize: 18, fontWeight: 700 }}>Add Harvest</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {[["Crop", "crop", "text", "span 2"], ["Field", "field", "text", ""], ["Date", "date", "date", ""], ["Buyer", "buyer", "text", "span 2"]].map(([label, key, type, col]) => (
                <div key={key} style={{ gridColumn: col || undefined }}>
                  <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>{label}</label>
                  <input type={type} value={String((form as Record<string, unknown>)[key] ?? "")} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} style={{ width: "100%", background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff", fontSize: 14, boxSizing: "border-box" }} />
                </div>
              ))}
              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Quantity</label>
                <input type="number" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: Number(e.target.value) }))} style={{ width: "100%", background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff", fontSize: 14, boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Unit</label>
                <select value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} style={{ width: "100%", background: "#161b27", border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff", fontSize: 14 }}>
                  {["kg", "ton", "maund", "bags"].map(u => <option key={u}>{u}</option>)}
                </select>
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Sale Price per Unit (Rs.)</label>
                <input type="number" value={form.salePrice} onChange={e => setForm(f => ({ ...f, salePrice: Number(e.target.value) }))} style={{ width: "100%", background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff", fontSize: 14, boxSizing: "border-box" }} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
              <button onClick={save} style={{ flex: 1, padding: "11px 0", background: "#34d399", border: "none", borderRadius: 8, color: "#0f1117", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Add Harvest</button>
              <button onClick={() => setShowModal(false)} style={{ padding: "11px 24px", background: "transparent", border: `1px solid ${border}`, borderRadius: 8, color: "rgba(255,255,255,.6)", fontSize: 14, cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
