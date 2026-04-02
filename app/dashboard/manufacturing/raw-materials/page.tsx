"use client";

import { useMemo, useState } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";
import { mapBomRecord, mapRawMaterialRecord } from "../_shared";

const ff = "'Outfit','Inter',sans-serif";
const bg = "rgba(255,255,255,0.03)";
const border = "rgba(255,255,255,0.07)";

export default function RawMaterialsPage() {
  const rawStore = useBusinessRecords("raw_material");
  const bomStore = useBusinessRecords("bom");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    name: "",
    unit: "kg",
    currentStock: 0,
    minStock: 10,
    unitCost: 0,
    supplier: "",
  });

  const materials = useMemo(() => rawStore.records.map(mapRawMaterialRecord), [rawStore.records]);
  const boms = useMemo(() => bomStore.records.map(mapBomRecord), [bomStore.records]);
  const totalValue = materials.reduce((sum, item) => sum + item.currentStock * item.unitCost, 0);

  async function save() {
    if (!form.name) return;
    await rawStore.create({
      title: form.name,
      status: form.currentStock <= form.minStock ? "low_stock" : "available",
      amount: form.unitCost,
      data: {
        unit: form.unit,
        currentStock: form.currentStock,
        minStock: form.minStock,
        supplier: form.supplier,
      },
    });
    setShowModal(false);
    setForm({
      name: "",
      unit: "kg",
      currentStock: 0,
      minStock: 10,
      unitCost: 0,
      supplier: "",
    });
  }

  return (
    <div style={{ padding: "28px 32px", fontFamily: ff, color: "#fff", minHeight: "100vh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 26 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>Raw Materials</h1>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,.42)", margin: 0 }}>Material inventory, reorder limits, aur BOM dependency overview.</p>
        </div>
        <button onClick={() => setShowModal(true)} style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: "#f97316", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
          + Add Material
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Total Materials", value: materials.length, color: "#f97316" },
          { label: "Low Stock", value: materials.filter((item) => item.isLow).length, color: "#ef4444" },
          { label: "Inventory Value", value: `Rs. ${totalValue.toLocaleString()}`, color: "#22c55e" },
          { label: "Suppliers", value: new Set(materials.map((item) => item.supplier).filter(Boolean)).size, color: "#38bdf8" },
        ].map((card) => (
          <div key={card.label} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 14, padding: "18px 20px" }}>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.48)", marginBottom: 6 }}>{card.label}</div>
            <div style={{ fontSize: 21, fontWeight: 800, color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr .8fr", gap: 16 }}>
        <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 14, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Material", "Unit", "Stock", "Min", "Unit Cost", "Value", "Supplier", "Used In BOMs"].map((head) => (
                  <th key={head} style={{ textAlign: "left", padding: "12px 16px", fontSize: 12, color: "rgba(255,255,255,.5)", borderBottom: `1px solid ${border}`, fontWeight: 600 }}>
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {materials.map((material) => {
                const usageCount = boms.filter((bom) => bom.materials.some((item) => item.toLowerCase() === material.name.toLowerCase())).length;
                return (
                  <tr key={material.id}>
                    <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontWeight: 700 }}>{material.name}</td>
                    <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>{material.unit}</td>
                    <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", color: material.isLow ? "#ef4444" : "#fff", fontWeight: material.isLow ? 700 : 400 }}>{material.currentStock}</td>
                    <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", color: "rgba(255,255,255,.55)" }}>{material.minStock}</td>
                    <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>Rs. {material.unitCost.toLocaleString()}</td>
                    <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", color: "#22c55e", fontWeight: 700 }}>Rs. {(material.currentStock * material.unitCost).toLocaleString()}</td>
                    <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", color: "rgba(255,255,255,.55)" }}>{material.supplier || "N/A"}</td>
                    <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>{usageCount}</td>
                  </tr>
                );
              })}
              {!rawStore.loading && materials.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ padding: 36, textAlign: "center", color: "rgba(255,255,255,.28)" }}>
                    No materials added yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 14, padding: 20 }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>Reorder Watch</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {materials.filter((item) => item.isLow).slice(0, 5).map((item) => (
                <div key={item.id} style={{ border: `1px solid ${border}`, borderRadius: 12, padding: "12px 14px", background: "rgba(255,255,255,.02)" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#ef4444" }}>{item.name}</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,.45)", marginTop: 4 }}>
                    Current {item.currentStock} {item.unit} • Min {item.minStock}
                  </div>
                </div>
              ))}
              {!materials.some((item) => item.isLow) && <div style={{ color: "rgba(255,255,255,.35)" }}>No low stock alerts.</div>}
            </div>
          </div>

          <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 14, padding: 20 }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>BOM Dependents</div>
            <div style={{ fontSize: 13, lineHeight: 1.7, color: "rgba(255,255,255,.55)" }}>
              Yeh page BOM planning ko support karta hai. Kisi material ka stock low ho to linked production delay ho sakti hai.
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#161b27", border: `1px solid ${border}`, borderRadius: 16, padding: 30, width: 520, fontFamily: ff }}>
            <h2 style={{ margin: "0 0 20px", fontSize: 18, fontWeight: 700 }}>Add Raw Material</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Material Name</label>
                <input value={form.name} onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))} style={{ width: "100%", background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Unit</label>
                <select value={form.unit} onChange={(e) => setForm((current) => ({ ...current, unit: e.target.value }))} style={{ width: "100%", background: "#161b27", border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff" }}>
                  {["kg", "ton", "liter", "meter", "piece", "bag"].map((unit) => <option key={unit}>{unit}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Supplier</label>
                <input value={form.supplier} onChange={(e) => setForm((current) => ({ ...current, supplier: e.target.value }))} style={{ width: "100%", background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Current Stock</label>
                <input type="number" value={form.currentStock} onChange={(e) => setForm((current) => ({ ...current, currentStock: Number(e.target.value) }))} style={{ width: "100%", background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Min Stock</label>
                <input type="number" value={form.minStock} onChange={(e) => setForm((current) => ({ ...current, minStock: Number(e.target.value) }))} style={{ width: "100%", background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff", boxSizing: "border-box" }} />
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Unit Cost (Rs.)</label>
                <input type="number" value={form.unitCost} onChange={(e) => setForm((current) => ({ ...current, unitCost: Number(e.target.value) }))} style={{ width: "100%", background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff", boxSizing: "border-box" }} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 18 }}>
              <button onClick={save} style={{ flex: 1, padding: "11px 0", background: "#f97316", border: "none", borderRadius: 8, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Add Material</button>
              <button onClick={() => setShowModal(false)} style={{ padding: "11px 24px", background: "transparent", border: `1px solid ${border}`, borderRadius: 8, color: "rgba(255,255,255,.65)", cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
