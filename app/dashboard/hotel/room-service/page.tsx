"use client";
import { useState } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";

const ff = "'Outfit','Inter',sans-serif";
const bg = "rgba(255,255,255,0.03)";
const border = "rgba(255,255,255,0.07)";
const STATUS_COLOR: Record<string, string> = { pending: "#f59e0b", preparing: "#3b82f6", delivered: "#34d399", cancelled: "#6b7280" };

export default function RoomServicePage() {
  const { records, loading, create, update } = useBusinessRecords("room_service_order");
  const reservationStore = useBusinessRecords("hotel_reservation");
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ room: "", items: "", amount: 0, notes: "" });

  const orders = records.map(r => ({
    id: r.id,
    room: r.title,
    items: (r.data?.items as string) || "",
    amount: r.amount || 0,
    notes: (r.data?.notes as string) || "",
    time: r.createdAt ? new Date(r.createdAt).toLocaleTimeString() : "",
    status: r.status || "pending",
  }));
  const activeRooms = new Set(reservationStore.records.filter(r => (r.status || "reserved") === "checked_in").map(r => String(r.data?.room || "")));

  const totalRevenue = orders.filter(o => o.status === "delivered").reduce((a, o) => a + o.amount, 0);

  async function save() {
    if (!form.room.trim() || !form.items.trim()) {
      setError("Room and ordered items are required.");
      return;
    }
    if (!activeRooms.has(form.room.trim())) {
      setError("Room service is only allowed for checked-in rooms.");
      return;
    }
    if (form.amount <= 0) {
      setError("Amount must be greater than zero.");
      return;
    }
    await create({ title: form.room, status: "pending", amount: form.amount, data: { items: form.items, notes: form.notes } });
    setShowModal(false);
    setError("");
    setForm({ room: "", items: "", amount: 0, notes: "" });
  }

  return (
    <div style={{ padding: "28px 32px", fontFamily: ff, color: "#fff", minHeight: "100vh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <div><h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>🍽️ Room Service</h1><p style={{ fontSize: 13, color: "rgba(255,255,255,.4)", margin: 0 }}>Manage room service orders</p></div>
        <button onClick={() => setShowModal(true)} style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: "#f97316", color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>+ New Order</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 28 }}>
        {[{ label: "Total Orders", val: orders.length, color: "#f97316" }, { label: "Pending", val: orders.filter(o => o.status === "pending").length, color: "#f59e0b" }, { label: "Preparing", val: orders.filter(o => o.status === "preparing").length, color: "#3b82f6" }, { label: "Revenue", val: `Rs. ${totalRevenue.toLocaleString()}`, color: "#34d399" }].map(s => (
          <div key={s.label} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 12, padding: "20px 24px" }}><div style={{ fontSize: 13, color: "rgba(255,255,255,.5)", marginBottom: 6 }}>{s.label}</div><div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.val}</div></div>
        ))}
      </div>

      {loading && <div style={{ textAlign: "center", padding: 40, color: "rgba(255,255,255,0.4)" }}>Loading...</div>}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {orders.map(o => (
          <div key={o.id} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 10, padding: "14px 20px", display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 4 }}>
                <span style={{ fontWeight: 700 }}>Room {o.room}</span>
                <span style={{ fontSize: 12, color: "rgba(255,255,255,.5)" }}>{o.time}</span>
              </div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,.6)", marginBottom: 2 }}>{o.items}</div>
              {o.notes && <div style={{ fontSize: 12, color: "rgba(255,255,255,.35)" }}>{o.notes}</div>}
            </div>
            <div style={{ fontWeight: 700, color: "#34d399", minWidth: 80, textAlign: "right" }}>Rs. {o.amount.toLocaleString()}</div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ display: "inline-block", background: `${STATUS_COLOR[o.status]}20`, color: STATUS_COLOR[o.status], borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>{o.status}</span>
              {o.status === "pending" && <button onClick={() => update(o.id, { status: "preparing" })} style={{ padding: "5px 10px", background: "rgba(59,130,246,.15)", border: "1px solid rgba(59,130,246,.3)", color: "#3b82f6", borderRadius: 6, fontSize: 11, cursor: "pointer" }}>Prepare</button>}
              {o.status === "preparing" && <button onClick={() => update(o.id, { status: "delivered" })} style={{ padding: "5px 10px", background: "rgba(52,211,153,.15)", border: "1px solid rgba(52,211,153,.3)", color: "#34d399", borderRadius: 6, fontSize: 11, cursor: "pointer" }}>Delivered</button>}
            </div>
          </div>
        ))}
        {!loading && orders.length === 0 && <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 12, padding: 40, textAlign: "center", color: "rgba(255,255,255,.25)" }}>No room service orders.</div>}
      </div>

      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#161b27", border: `1px solid ${border}`, borderRadius: 16, padding: 32, width: 440, fontFamily: ff }}>
            <h2 style={{ margin: "0 0 24px", fontSize: 18, fontWeight: 700 }}>New Room Service Order</h2>
            {[["Room Number", "room", "text"], ["Items Ordered", "items", "text"], ["Notes", "notes", "text"]].map(([label, key, type]) => (
              <div key={key} style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>{label}</label>
                <input type={type} value={String((form as Record<string, unknown>)[key] ?? "")} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} style={{ width: "100%", background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff", fontSize: 14, boxSizing: "border-box" }} />
              </div>
            ))}
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Amount (Rs.)</label>
              <input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: Number(e.target.value) }))} style={{ width: "100%", background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff", fontSize: 14, boxSizing: "border-box" }} />
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              {error && <div style={{ color: "#fda4af", fontSize: 12, flex: 1 }}>{error}</div>}
              <button onClick={save} style={{ flex: 1, padding: "11px 0", background: "#f97316", border: "none", borderRadius: 8, color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Create Order</button>
              <button onClick={() => { setShowModal(false); setError(""); }} style={{ padding: "11px 24px", background: "transparent", border: `1px solid ${border}`, borderRadius: 8, color: "rgba(255,255,255,.6)", fontSize: 14, cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
