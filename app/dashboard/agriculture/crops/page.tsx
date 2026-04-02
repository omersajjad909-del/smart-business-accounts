"use client";
import { useState } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";

const ff = "'Outfit','Inter',sans-serif";
const bg = "rgba(255,255,255,.03)";
const border = "rgba(255,255,255,.07)";
const STATUS_COLOR: Record<string, string> = { growing: "#34d399", harvested: "#f59e0b", planted: "#818cf8", failed: "#ef4444" };

export default function CropsPage() {
  const { records, loading, create, update } = useBusinessRecords("crop");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: "", field: "", area: "", plantDate: "", harvestDate: "", expectedYield: 0 });

  const crops = records.map(r => ({
    id: r.id,
    name: r.title,
    field: (r.data?.field as string) || "",
    area: (r.data?.area as string) || "",
    plantDate: r.date?.split("T")[0] || "",
    harvestDate: (r.data?.harvestDate as string) || "",
    expectedYield: Number(r.data?.expectedYield) || 0,
    status: r.status || "planted",
  }));

  async function save() {
    const name = form.name.trim();
    const field = form.field.trim();
    if (!name || !field || !form.plantDate) {
      alert("Crop name, field, aur plant date required hain.");
      return;
    }
    if (crops.some(c => c.name.trim().toLowerCase() === name.toLowerCase() && c.field.trim().toLowerCase() === field.toLowerCase() && c.status !== "harvested" && c.status !== "failed")) {
      alert("Is field me ye crop cycle already active hai.");
      return;
    }
    await create({ title: form.name, status: "planted", date: form.plantDate, data: { field: form.field, area: form.area, harvestDate: form.harvestDate, expectedYield: form.expectedYield } });
    setShowModal(false);
    setForm({ name: "", field: "", area: "", plantDate: "", harvestDate: "", expectedYield: 0 });
  }

  return (
    <div style={{ padding: "28px 32px", fontFamily: ff, color: "#fff", minHeight: "100vh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <div><h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>🌾 Crops</h1><p style={{ fontSize: 13, color: "rgba(255,255,255,.4)", margin: 0 }}>Track crop cycles and yields</p></div>
        <button onClick={() => setShowModal(true)} style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: "#34d399", color: "#0f1117", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>+ Add Crop</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 28 }}>
        {[{ label: "Total Crops", val: crops.length, color: "#34d399" }, { label: "Growing", val: crops.filter(c => c.status === "growing").length, color: "#818cf8" }, { label: "Planted", val: crops.filter(c => c.status === "planted").length, color: "#f59e0b" }, { label: "Harvested", val: crops.filter(c => c.status === "harvested").length, color: "#34d399" }].map(s => (
          <div key={s.label} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 12, padding: "20px 24px" }}><div style={{ fontSize: 13, color: "rgba(255,255,255,.5)", marginBottom: 6 }}>{s.label}</div><div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.val}</div></div>
        ))}
      </div>

      {loading && <div style={{ textAlign: "center", padding: 40, color: "rgba(255,255,255,0.4)" }}>Loading...</div>}

      <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 12 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr>{["Crop", "Field", "Area", "Planted", "Harvest Due", "Expected Yield", "Status", "Action"].map(h => (
            <th key={h} style={{ textAlign: "left", padding: "12px 16px", fontSize: 12, color: "rgba(255,255,255,.5)", borderBottom: `1px solid ${border}`, fontWeight: 600 }}>{h}</th>
          ))}</tr></thead>
          <tbody>
            {crops.map(c => (
              <tr key={c.id}>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontWeight: 600 }}>{c.name}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontSize: 13 }}>{c.field}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontSize: 13 }}>{c.area}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontSize: 12 }}>{c.plantDate}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontSize: 12 }}>{c.harvestDate}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontSize: 13 }}>{c.expectedYield} kg</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>
                  <span style={{ display: "inline-block", background: `${STATUS_COLOR[c.status]}20`, color: STATUS_COLOR[c.status], borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>{c.status}</span>
                </td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>
                  {c.status === "planted" && <button onClick={() => update(c.id, { status: "growing" })} style={{ padding: "5px 10px", background: "rgba(52,211,153,.15)", border: "1px solid rgba(52,211,153,.3)", color: "#34d399", borderRadius: 6, fontSize: 11, cursor: "pointer" }}>Growing</button>}
                  {c.status === "growing" && <button onClick={() => update(c.id, { status: "harvested" })} style={{ padding: "5px 10px", background: "rgba(245,158,11,.15)", border: "1px solid rgba(245,158,11,.3)", color: "#f59e0b", borderRadius: 6, fontSize: 11, cursor: "pointer" }}>Harvest</button>}
                  {(c.status === "planted" || c.status === "growing") && <button onClick={() => update(c.id, { status: "failed" })} style={{ marginLeft: 8, padding: "5px 10px", background: "rgba(239,68,68,.15)", border: "1px solid rgba(239,68,68,.3)", color: "#ef4444", borderRadius: 6, fontSize: 11, cursor: "pointer" }}>Fail</button>}
                </td>
              </tr>
            ))}
            {!loading && crops.length === 0 && <tr><td colSpan={8} style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,.25)" }}>No crops yet.</td></tr>}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#161b27", border: `1px solid ${border}`, borderRadius: 16, padding: 32, width: 480, fontFamily: ff }}>
            <h2 style={{ margin: "0 0 24px", fontSize: 18, fontWeight: 700 }}>Add Crop</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {[["Crop Name", "name", "text", "span 2"], ["Field", "field", "text", ""], ["Area (acres)", "area", "text", ""], ["Plant Date", "plantDate", "date", ""], ["Harvest Date", "harvestDate", "date", ""]].map(([label, key, type, col]) => (
                <div key={key} style={{ gridColumn: col || undefined }}>
                  <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>{label}</label>
                  <input type={type} value={String((form as Record<string, unknown>)[key] ?? "")} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} style={{ width: "100%", background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff", fontSize: 14, boxSizing: "border-box" }} />
                </div>
              ))}
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Expected Yield (kg)</label>
                <input type="number" value={form.expectedYield} onChange={e => setForm(f => ({ ...f, expectedYield: Number(e.target.value) }))} style={{ width: "100%", background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff", fontSize: 14, boxSizing: "border-box" }} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
              <button onClick={save} style={{ flex: 1, padding: "11px 0", background: "#34d399", border: "none", borderRadius: 8, color: "#0f1117", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Add Crop</button>
              <button onClick={() => setShowModal(false)} style={{ padding: "11px 24px", background: "transparent", border: `1px solid ${border}`, borderRadius: 8, color: "rgba(255,255,255,.6)", fontSize: 14, cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
