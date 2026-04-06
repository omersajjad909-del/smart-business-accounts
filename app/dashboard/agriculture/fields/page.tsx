"use client";

import toast from "react-hot-toast";
import { useState } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";

const ff = "'Outfit','Inter',sans-serif";
const bg = "rgba(255,255,255,.03)";
const border = "rgba(255,255,255,.07)";

export default function FieldsPage() {
  const { records, loading, create, update } = useBusinessRecords("field");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: "", area: "", soilType: "", irrigationType: "", location: "" });

  const fields = records.map(r => ({
    id: r.id,
    name: r.title,
    area: (r.data?.area as string) || "",
    soilType: (r.data?.soilType as string) || "",
    irrigationType: (r.data?.irrigationType as string) || "",
    location: (r.data?.location as string) || "",
    status: r.status || "active",
  }));

  const totalArea = fields.reduce((a, f) => a + parseFloat(f.area || "0"), 0);

  async function save() {
    const name = form.name.trim();
    if (!name || !form.area || !form.location.trim()) {
      toast.error("Field name, area, aur location required hain.");
      return;
    }
    if (fields.some(f => f.name.trim().toLowerCase() === name.toLowerCase())) {
      toast.error("Ye field already maujood hai.");
      return;
    }
    await create({ title: form.name, status: "active", data: { area: form.area, soilType: form.soilType, irrigationType: form.irrigationType, location: form.location } });
    setShowModal(false);
    setForm({ name: "", area: "", soilType: "", irrigationType: "", location: "" });
  }

  return (
    <div style={{ padding: "28px 32px", fontFamily: ff, color: "#fff", minHeight: "100vh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <div><h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>🌿 Fields</h1><p style={{ fontSize: 13, color: "rgba(255,255,255,.4)", margin: 0 }}>Manage agricultural fields</p></div>
        <button onClick={() => setShowModal(true)} style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: "#34d399", color: "#0f1117", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>+ Add Field</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 28 }}>
        {[{ label: "Total Fields", val: fields.length, color: "#34d399" }, { label: "Active", val: fields.filter(f => f.status === "active").length, color: "#818cf8" }, { label: "Total Area", val: `${totalArea.toFixed(1)} acres`, color: "#f59e0b" }].map(s => (
          <div key={s.label} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 12, padding: "20px 24px" }}><div style={{ fontSize: 13, color: "rgba(255,255,255,.5)", marginBottom: 6 }}>{s.label}</div><div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.val}</div></div>
        ))}
      </div>

      {loading && <div style={{ textAlign: "center", padding: 40, color: "rgba(255,255,255,0.4)" }}>Loading...</div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 16 }}>
        {fields.map(f => (
          <div key={f.id} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 12, padding: "20px 24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{f.name}</div>
              <span style={{ display: "inline-block", background: f.status === "active" ? "rgba(52,211,153,.15)" : "rgba(107,114,128,.15)", color: f.status === "active" ? "#34d399" : "#6b7280", borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>{f.status}</span>
            </div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,.5)", marginBottom: 4 }}>📐 Area: {f.area} acres</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,.5)", marginBottom: 4 }}>🪨 Soil: {f.soilType}</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,.5)", marginBottom: 4 }}>💧 Irrigation: {f.irrigationType}</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,.5)", marginBottom: 12 }}>📍 {f.location}</div>
            <button onClick={() => update(f.id, { status: f.status === "active" ? "fallow" : "active" })} style={{ padding: "5px 12px", background: "rgba(249,115,22,.15)", border: "1px solid rgba(249,115,22,.3)", color: "#f97316", borderRadius: 6, fontSize: 11, cursor: "pointer" }}>
              {f.status === "active" ? "Mark Fallow" : "Activate"}
            </button>
          </div>
        ))}
        {!loading && fields.length === 0 && <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 12, padding: 40, textAlign: "center", color: "rgba(255,255,255,.25)", gridColumn: "1/-1" }}>No fields yet.</div>}
      </div>

      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#161b27", border: `1px solid ${border}`, borderRadius: 16, padding: 32, width: 480, fontFamily: ff }}>
            <h2 style={{ margin: "0 0 24px", fontSize: 18, fontWeight: 700 }}>Add Field</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {[["Field Name", "name", "span 2"], ["Location", "location", "span 2"], ["Area (acres)", "area", ""], ["Soil Type", "soilType", ""]].map(([label, key, col]) => (
                <div key={key} style={{ gridColumn: col || undefined }}>
                  <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>{label}</label>
                  <input type="text" value={String((form as Record<string, unknown>)[key] ?? "")} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} style={{ width: "100%", background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff", fontSize: 14, boxSizing: "border-box" }} />
                </div>
              ))}
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Irrigation Type</label>
                <select value={form.irrigationType} onChange={e => setForm(f => ({ ...f, irrigationType: e.target.value }))} style={{ width: "100%", background: "#161b27", border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff", fontSize: 14 }}>
                  {["Drip", "Sprinkler", "Flood", "Canal", "Tube Well", "Rain-fed"].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
              <button onClick={save} style={{ flex: 1, padding: "11px 0", background: "#34d399", border: "none", borderRadius: 8, color: "#0f1117", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Add Field</button>
              <button onClick={() => setShowModal(false)} style={{ padding: "11px 24px", background: "transparent", border: `1px solid ${border}`, borderRadius: 8, color: "rgba(255,255,255,.6)", fontSize: 14, cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
