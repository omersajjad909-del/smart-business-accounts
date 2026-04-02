"use client";

import { useMemo, useState } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";
import { mapBomRecord, mapProductionOrderRecord, mapRawMaterialRecord } from "../_shared";

const ff = "'Outfit','Inter',sans-serif";
const bg = "rgba(255,255,255,0.03)";
const border = "rgba(255,255,255,0.07)";

export default function BOMPage() {
  const bomStore = useBusinessRecords("bom");
  const rawMaterialStore = useBusinessRecords("raw_material");
  const productionStore = useBusinessRecords("production_order");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ product: "", version: "v1.0", materials: "", unitCost: 0, yieldUnits: 1 });
  const [formError, setFormError] = useState("");

  const boms = useMemo(() => bomStore.records.map(mapBomRecord), [bomStore.records]);
  const materials = useMemo(() => rawMaterialStore.records.map(mapRawMaterialRecord), [rawMaterialStore.records]);
  const orders = useMemo(() => productionStore.records.map(mapProductionOrderRecord), [productionStore.records]);

  const materialNames = materials.map((item) => item.name);

  async function save() {
    const product = form.product.trim();
    const version = form.version.trim() || "v1.0";
    const normalizedMaterials = form.materials.split(",").map((item) => item.trim()).filter(Boolean);
    if (!product) {
      setFormError("Product name is required.");
      return;
    }
    if (!normalizedMaterials.length) {
      setFormError("At least one material is required.");
      return;
    }
    if (form.unitCost < 0 || form.yieldUnits <= 0) {
      setFormError("Yield must be greater than zero and cost cannot be negative.");
      return;
    }
    setFormError("");
    await bomStore.create({
      title: product,
      status: "active",
      amount: form.unitCost,
      data: {
        version,
        materials: normalizedMaterials.join(", "),
        yield: form.yieldUnits,
      },
    });
    setShowModal(false);
    setForm({ product: "", version: "v1.0", materials: "", unitCost: 0, yieldUnits: 1 });
    setFormError("");
  }

  return (
    <div style={{ padding: "28px 32px", fontFamily: ff, color: "#fff", minHeight: "100vh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 26 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>Bill of Materials</h1>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,.42)", margin: 0 }}>Define finished products, their ingredients, aur linked production planning base.</p>
        </div>
        <button onClick={() => { setShowModal(true); setFormError(""); }} style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: "#f97316", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
          + New BOM
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Total BOMs", value: boms.length, color: "#f97316" },
          { label: "Products In Production", value: new Set(orders.map((item) => item.product)).size, color: "#38bdf8" },
          { label: "Raw Materials Available", value: materials.length, color: "#22c55e" },
          { label: "Average Recipe Cost", value: `Rs. ${boms.length ? Math.round(boms.reduce((sum, item) => sum + item.unitCost, 0) / boms.length).toLocaleString() : 0}`, color: "#f59e0b" },
        ].map((card) => (
          <div key={card.label} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 14, padding: "18px 20px" }}>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.48)", marginBottom: 6 }}>{card.label}</div>
            <div style={{ fontSize: 21, fontWeight: 800, color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr .8fr", gap: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {boms.map((bom) => {
            const linkedOrders = orders.filter((order) => order.product === bom.product).length;
            return (
              <div key={bom.id} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 14, padding: "20px 22px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 800 }}>{bom.product}</div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,.42)", marginTop: 4 }}>
                      Version {bom.version} • Yield {bom.yieldUnits} units • Linked orders {linkedOrders}
                    </div>
                  </div>
                  <div style={{ color: "#22c55e", fontSize: 15, fontWeight: 800 }}>Rs. {bom.unitCost.toLocaleString()}</div>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {bom.materials.map((item) => {
                    const knownMaterial = materials.find((material) => material.name.toLowerCase() === item.toLowerCase());
                    return (
                      <span
                        key={`${bom.id}-${item}`}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          background: knownMaterial ? "rgba(34,197,94,.12)" : "rgba(249,115,22,.12)",
                          color: knownMaterial ? "#22c55e" : "#f97316",
                          borderRadius: 999,
                          padding: "5px 11px",
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      >
                        {item}
                        {knownMaterial && knownMaterial.isLow ? <span style={{ color: "#ef4444" }}>Low</span> : null}
                      </span>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {!bomStore.loading && boms.length === 0 && (
            <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 14, padding: 36, textAlign: "center", color: "rgba(255,255,255,.28)" }}>
              No BOMs defined yet.
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 14, padding: 20 }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Material Master Reference</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {materialNames.length ? materialNames.map((name) => (
                <span key={name} style={{ padding: "5px 10px", borderRadius: 999, background: "rgba(56,189,248,.12)", color: "#38bdf8", fontSize: 12, fontWeight: 600 }}>
                  {name}
                </span>
              )) : <div style={{ color: "rgba(255,255,255,.3)", fontSize: 13 }}>Add raw materials first for better BOM planning.</div>}
            </div>
          </div>

          <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 14, padding: 20 }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>Flow</div>
            <div style={{ fontSize: 13, lineHeight: 1.7, color: "rgba(255,255,255,.55)" }}>
              1. Raw materials define karo.
              <br />
              2. BOM banao.
              <br />
              3. BOM ke against production order issue karo.
              <br />
              4. Work orders aur quality checks complete karo.
              <br />
              5. Finished goods batch receive karo.
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#161b27", border: `1px solid ${border}`, borderRadius: 16, padding: 30, width: 520, fontFamily: ff }}>
            <h2 style={{ margin: "0 0 20px", fontSize: 18, fontWeight: 700 }}>New Bill of Materials</h2>
            {formError && <div style={{ marginBottom: 14, padding: "10px 12px", borderRadius: 8, background: "rgba(239,68,68,.14)", border: "1px solid rgba(239,68,68,.28)", color: "#fca5a5", fontSize: 12 }}>{formError}</div>}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Product Name</label>
                <input value={form.product} onChange={(e) => setForm((current) => ({ ...current, product: e.target.value }))} style={{ width: "100%", background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Version</label>
                <input value={form.version} onChange={(e) => setForm((current) => ({ ...current, version: e.target.value }))} style={{ width: "100%", background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Yield Units</label>
                <input type="number" value={form.yieldUnits} onChange={(e) => setForm((current) => ({ ...current, yieldUnits: Number(e.target.value) }))} style={{ width: "100%", background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff", boxSizing: "border-box" }} />
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Materials</label>
                <input list="manufacturing-materials" value={form.materials} onChange={(e) => setForm((current) => ({ ...current, materials: e.target.value }))} placeholder="Steel Sheets, Paint, Packaging" style={{ width: "100%", background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff", boxSizing: "border-box" }} />
                <datalist id="manufacturing-materials">
                  {materialNames.map((name) => <option key={name} value={name} />)}
                </datalist>
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Unit Cost (Rs.)</label>
                <input type="number" value={form.unitCost} onChange={(e) => setForm((current) => ({ ...current, unitCost: Number(e.target.value) }))} style={{ width: "100%", background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff", boxSizing: "border-box" }} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 18 }}>
              <button onClick={save} style={{ flex: 1, padding: "11px 0", background: "#f97316", border: "none", borderRadius: 8, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Create BOM</button>
              <button onClick={() => { setShowModal(false); setFormError(""); }} style={{ padding: "11px 24px", background: "transparent", border: `1px solid ${border}`, borderRadius: 8, color: "rgba(255,255,255,.65)", cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
