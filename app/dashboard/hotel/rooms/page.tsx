"use client";
import { useState } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";

const ff = "'Outfit','Inter',sans-serif";
const bg = "rgba(255,255,255,0.03)";
const border = "rgba(255,255,255,0.07)";
const STATUS_COLOR: Record<string, string> = { available: "#34d399", occupied: "#ef4444", cleaning: "#f59e0b", maintenance: "#6b7280" };

export default function HotelRoomsPage() {
  const { records, loading, create, update } = useBusinessRecords("hotel_room");
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ number: "", type: "Standard", floor: "", rate: 0, capacity: 1 });

  const rooms = records.map(r => ({
    id: r.id,
    number: r.title,
    type: (r.data?.type as string) || "Standard",
    floor: (r.data?.floor as string) || "",
    rate: r.amount || 0,
    capacity: Number(r.data?.capacity) || 1,
    status: r.status || "available",
  }));

  const available = rooms.filter(r => r.status === "available").length;
  const occupied = rooms.filter(r => r.status === "occupied").length;
  const occupancy = rooms.length > 0 ? Math.round(occupied / rooms.length * 100) : 0;

  async function save() {
    if (!form.number.trim() || !form.floor.trim()) {
      setError("Room number and floor are required.");
      return;
    }
    if (form.rate <= 0 || form.capacity <= 0) {
      setError("Rate and capacity must be greater than zero.");
      return;
    }
    if (rooms.some(r => r.number.toLowerCase() === form.number.trim().toLowerCase())) {
      setError("This room already exists.");
      return;
    }
    await create({ title: form.number, status: "available", amount: form.rate, data: { type: form.type, floor: form.floor, capacity: form.capacity } });
    setShowModal(false);
    setError("");
    setForm({ number: "", type: "Standard", floor: "", rate: 0, capacity: 1 });
  }

  return (
    <div style={{ padding: "28px 32px", fontFamily: ff, color: "#fff", minHeight: "100vh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <div><h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>🏨 Hotel Rooms</h1><p style={{ fontSize: 13, color: "rgba(255,255,255,.4)", margin: 0 }}>Manage room inventory and status</p></div>
        <button onClick={() => setShowModal(true)} style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: "#f97316", color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>+ Add Room</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 28 }}>
        {[{ label: "Total Rooms", val: rooms.length, color: "#f97316" }, { label: "Available", val: available, color: "#34d399" }, { label: "Occupied", val: occupied, color: "#ef4444" }, { label: "Occupancy Rate", val: `${occupancy}%`, color: "#818cf8" }].map(s => (
          <div key={s.label} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 12, padding: "20px 24px" }}><div style={{ fontSize: 13, color: "rgba(255,255,255,.5)", marginBottom: 6 }}>{s.label}</div><div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.val}</div></div>
        ))}
      </div>

      {loading && <div style={{ textAlign: "center", padding: 40, color: "rgba(255,255,255,0.4)" }}>Loading...</div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 12 }}>
        {rooms.map(r => (
          <div key={r.id} style={{ background: bg, border: `1px solid ${STATUS_COLOR[r.status]}40`, borderRadius: 12, padding: "16px 20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={{ fontWeight: 800, fontSize: 18 }}>#{r.number}</div>
              <span style={{ display: "inline-block", background: `${STATUS_COLOR[r.status]}20`, color: STATUS_COLOR[r.status], borderRadius: 6, padding: "2px 8px", fontSize: 10, fontWeight: 600 }}>{r.status}</span>
            </div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.5)", marginBottom: 2 }}>{r.type} · Floor {r.floor}</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.5)", marginBottom: 10 }}>Rs. {r.rate.toLocaleString()}/night · {r.capacity} guests</div>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {(["available", "occupied", "cleaning", "maintenance"] as const).filter(s => s !== r.status).map(s => (
                <button key={s} onClick={() => update(r.id, { status: s })} style={{ padding: "3px 8px", background: `${STATUS_COLOR[s]}15`, border: `1px solid ${STATUS_COLOR[s]}40`, color: STATUS_COLOR[s], borderRadius: 4, fontSize: 10, cursor: "pointer" }}>{s}</button>
              ))}
            </div>
          </div>
        ))}
        {!loading && rooms.length === 0 && <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 12, padding: 40, textAlign: "center", color: "rgba(255,255,255,.25)", gridColumn: "1/-1" }}>No rooms added yet.</div>}
      </div>

      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#161b27", border: `1px solid ${border}`, borderRadius: 16, padding: 32, width: 440, fontFamily: ff }}>
            <h2 style={{ margin: "0 0 24px", fontSize: 18, fontWeight: 700 }}>Add Room</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Room Number</label>
                <input type="text" value={form.number} onChange={e => setForm(f => ({ ...f, number: e.target.value }))} style={{ width: "100%", background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff", fontSize: 14, boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Floor</label>
                <input type="text" value={form.floor} onChange={e => setForm(f => ({ ...f, floor: e.target.value }))} style={{ width: "100%", background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff", fontSize: 14, boxSizing: "border-box" }} />
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Room Type</label>
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} style={{ width: "100%", background: "#161b27", border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff", fontSize: 14 }}>
                  {["Standard", "Deluxe", "Suite", "Presidential"].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Rate/Night (Rs.)</label>
                <input type="number" value={form.rate} onChange={e => setForm(f => ({ ...f, rate: Number(e.target.value) }))} style={{ width: "100%", background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff", fontSize: 14, boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Capacity</label>
                <input type="number" value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: Number(e.target.value) }))} style={{ width: "100%", background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff", fontSize: 14, boxSizing: "border-box" }} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
              {error && <div style={{ color: "#fda4af", fontSize: 12, flex: 1 }}>{error}</div>}
              <button onClick={save} style={{ flex: 1, padding: "11px 0", background: "#f97316", border: "none", borderRadius: 8, color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Add Room</button>
              <button onClick={() => { setShowModal(false); setError(""); }} style={{ padding: "11px 24px", background: "transparent", border: `1px solid ${border}`, borderRadius: 8, color: "rgba(255,255,255,.6)", fontSize: 14, cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
