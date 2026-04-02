"use client";
import { useState } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";

const ff = "'Outfit','Inter',sans-serif";
const bg = "rgba(255,255,255,.03)";
const border = "rgba(255,255,255,.07)";

export default function LivestockPage() {
  const { records, loading, create } = useBusinessRecords("livestock");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ type: "Cattle", breed: "", count: 1, dob: "", weight: 0, notes: "" });

  const animals = records.map(r => ({
    id: r.id,
    type: r.title,
    breed: (r.data?.breed as string) || "",
    count: Number(r.data?.count) || 1,
    dob: r.date?.split("T")[0] || "",
    weight: Number(r.data?.weight) || 0,
    notes: (r.data?.notes as string) || "",
    status: r.status || "healthy",
  }));

  const totalAnimals = animals.reduce((a, x) => a + x.count, 0);

  async function save() {
    if (!form.type || !form.breed.trim() || form.count <= 0) {
      alert("Animal type, breed, aur valid count required hain.");
      return;
    }
    await create({ title: form.type, status: "healthy", date: form.dob, data: { breed: form.breed, count: form.count, weight: form.weight, notes: form.notes } });
    setShowModal(false);
    setForm({ type: "Cattle", breed: "", count: 1, dob: "", weight: 0, notes: "" });
  }

  return (
    <div style={{ padding: "28px 32px", fontFamily: ff, color: "#fff", minHeight: "100vh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <div><h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>🐄 Livestock</h1><p style={{ fontSize: 13, color: "rgba(255,255,255,.4)", margin: 0 }}>Track livestock health and records</p></div>
        <button onClick={() => setShowModal(true)} style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: "#34d399", color: "#0f1117", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>+ Add Animal</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 28 }}>
        {[{ label: "Total Animals", val: totalAnimals, color: "#34d399" }, { label: "Healthy", val: animals.filter(a => a.status === "healthy").length, color: "#818cf8" }, { label: "Animal Types", val: new Set(animals.map(a => a.type)).size, color: "#f59e0b" }].map(s => (
          <div key={s.label} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 12, padding: "20px 24px" }}><div style={{ fontSize: 13, color: "rgba(255,255,255,.5)", marginBottom: 6 }}>{s.label}</div><div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.val}</div></div>
        ))}
      </div>

      {loading && <div style={{ textAlign: "center", padding: 40, color: "rgba(255,255,255,0.4)" }}>Loading...</div>}

      <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 12 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr>{["Type", "Breed", "Count", "DOB", "Avg Weight", "Status", "Notes"].map(h => (
            <th key={h} style={{ textAlign: "left", padding: "12px 16px", fontSize: 12, color: "rgba(255,255,255,.5)", borderBottom: `1px solid ${border}`, fontWeight: 600 }}>{h}</th>
          ))}</tr></thead>
          <tbody>
            {animals.map(a => (
              <tr key={a.id}>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontWeight: 600 }}>{a.type}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontSize: 13 }}>{a.breed}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontWeight: 600, color: "#34d399" }}>{a.count}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontSize: 12 }}>{a.dob}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontSize: 13 }}>{a.weight} kg</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>
                  <span style={{ display: "inline-block", background: a.status === "healthy" ? "rgba(52,211,153,.15)" : "rgba(239,68,68,.15)", color: a.status === "healthy" ? "#34d399" : "#ef4444", borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>{a.status}</span>
                </td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontSize: 12, color: "rgba(255,255,255,.5)" }}>{a.notes}</td>
              </tr>
            ))}
            {!loading && animals.length === 0 && <tr><td colSpan={7} style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,.25)" }}>No livestock records yet.</td></tr>}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#161b27", border: `1px solid ${border}`, borderRadius: 16, padding: 32, width: 480, fontFamily: ff }}>
            <h2 style={{ margin: "0 0 24px", fontSize: 18, fontWeight: 700 }}>Add Livestock</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Animal Type</label>
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} style={{ width: "100%", background: "#161b27", border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff", fontSize: 14 }}>
                  {["Cattle", "Buffalo", "Goat", "Sheep", "Poultry", "Other"].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Breed</label>
                <input type="text" value={form.breed} onChange={e => setForm(f => ({ ...f, breed: e.target.value }))} style={{ width: "100%", background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff", fontSize: 14, boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Count</label>
                <input type="number" value={form.count} onChange={e => setForm(f => ({ ...f, count: Number(e.target.value) }))} style={{ width: "100%", background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff", fontSize: 14, boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Avg Weight (kg)</label>
                <input type="number" value={form.weight} onChange={e => setForm(f => ({ ...f, weight: Number(e.target.value) }))} style={{ width: "100%", background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff", fontSize: 14, boxSizing: "border-box" }} />
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Notes</label>
                <input type="text" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} style={{ width: "100%", background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff", fontSize: 14, boxSizing: "border-box" }} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
              <button onClick={save} style={{ flex: 1, padding: "11px 0", background: "#34d399", border: "none", borderRadius: 8, color: "#0f1117", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Add</button>
              <button onClick={() => setShowModal(false)} style={{ padding: "11px 24px", background: "transparent", border: `1px solid ${border}`, borderRadius: 8, color: "rgba(255,255,255,.6)", fontSize: 14, cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
