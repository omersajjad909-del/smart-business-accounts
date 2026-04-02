"use client";
import { useState } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";

const ff = "'Outfit','Inter',sans-serif";
const bg = "rgba(255,255,255,0.03)";
const border = "rgba(255,255,255,0.07)";
const STATUS_COLOR: Record<string, string> = { checked_in: "#34d399", checked_out: "#6b7280", reserved: "#818cf8" };

export default function FrontDeskPage() {
  const { records, loading, create, update } = useBusinessRecords("hotel_reservation");
  const roomStore = useBusinessRecords("hotel_room");
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ guest: "", room: "", checkIn: "", checkOut: "", phone: "", adults: 1, children: 0 });

  const reservations = records.map(r => ({
    id: r.id,
    guest: r.title,
    room: (r.data?.room as string) || "",
    checkIn: r.date?.split("T")[0] || "",
    checkOut: (r.data?.checkOut as string) || "",
    phone: (r.data?.phone as string) || "",
    adults: Number(r.data?.adults) || 1,
    children: Number(r.data?.children) || 0,
    amount: r.amount || 0,
    status: r.status || "reserved",
  }));
  const rooms = roomStore.records.map(r => ({ id: r.id, number: r.title, status: r.status || "available" }));

  const checkedIn = reservations.filter(r => r.status === "checked_in").length;

  async function save() {
    if (!form.guest.trim() || !form.room.trim() || !form.checkIn || !form.checkOut) {
      setError("Guest, room, check-in, and check-out are required.");
      return;
    }
    if (form.checkOut < form.checkIn) {
      setError("Check-out must be on or after check-in.");
      return;
    }
    if (reservations.some(r => r.room === form.room && r.status !== "checked_out")) {
      setError("This room already has an active reservation.");
      return;
    }
    const room = rooms.find(r => r.number === form.room);
    if (!room || room.status === "maintenance") {
      setError("Selected room is unavailable.");
      return;
    }
    await create({ title: form.guest, status: "reserved", date: form.checkIn, data: { room: form.room, checkOut: form.checkOut, phone: form.phone, adults: form.adults, children: form.children } });
    setShowModal(false);
    setError("");
    setForm({ guest: "", room: "", checkIn: "", checkOut: "", phone: "", adults: 1, children: 0 });
  }

  return (
    <div style={{ padding: "28px 32px", fontFamily: ff, color: "#fff", minHeight: "100vh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <div><h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>🏁 Front Desk</h1><p style={{ fontSize: 13, color: "rgba(255,255,255,.4)", margin: 0 }}>Manage check-ins, check-outs, and reservations</p></div>
        <button onClick={() => setShowModal(true)} style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: "#f97316", color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>+ New Reservation</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 28 }}>
        {[{ label: "Total Reservations", val: reservations.length, color: "#f97316" }, { label: "Checked In", val: checkedIn, color: "#34d399" }, { label: "Reserved", val: reservations.filter(r => r.status === "reserved").length, color: "#818cf8" }].map(s => (
          <div key={s.label} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 12, padding: "20px 24px" }}><div style={{ fontSize: 13, color: "rgba(255,255,255,.5)", marginBottom: 6 }}>{s.label}</div><div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.val}</div></div>
        ))}
      </div>

      {loading && <div style={{ textAlign: "center", padding: 40, color: "rgba(255,255,255,0.4)" }}>Loading...</div>}

      <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 12 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr>{["Guest", "Room", "Check In", "Check Out", "Phone", "Guests", "Status", "Action"].map(h => (
            <th key={h} style={{ textAlign: "left", padding: "12px 16px", fontSize: 12, color: "rgba(255,255,255,.5)", borderBottom: `1px solid ${border}`, fontWeight: 600 }}>{h}</th>
          ))}</tr></thead>
          <tbody>
            {reservations.map(r => (
              <tr key={r.id}>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontWeight: 600 }}>{r.guest}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>{r.room}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontSize: 12 }}>{r.checkIn}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontSize: 12 }}>{r.checkOut}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontSize: 13 }}>{r.phone}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontSize: 13 }}>{r.adults}A {r.children > 0 ? `${r.children}C` : ""}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>
                  <span style={{ display: "inline-block", background: `${STATUS_COLOR[r.status]}20`, color: STATUS_COLOR[r.status], borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>{r.status.replace("_", " ")}</span>
                </td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>
                  {r.status === "reserved" && <button onClick={async () => {
                    const room = rooms.find(roomRow => roomRow.number === r.room);
                    if (!room || room.status === "maintenance") {
                      window.alert("Room is unavailable for check-in.");
                      return;
                    }
                    await update(r.id, { status: "checked_in" });
                    if (room.id) await roomStore.update(room.id, { status: "occupied" });
                  }} style={{ padding: "5px 10px", background: "rgba(52,211,153,.15)", border: "1px solid rgba(52,211,153,.3)", color: "#34d399", borderRadius: 6, fontSize: 11, cursor: "pointer" }}>Check In</button>}
                  {r.status === "checked_in" && <button onClick={async () => {
                    await update(r.id, { status: "checked_out" });
                    const room = rooms.find(roomRow => roomRow.number === r.room);
                    if (room?.id) await roomStore.update(room.id, { status: "cleaning" });
                  }} style={{ padding: "5px 10px", background: "rgba(107,114,128,.15)", border: "1px solid rgba(107,114,128,.3)", color: "#6b7280", borderRadius: 6, fontSize: 11, cursor: "pointer" }}>Check Out</button>}
                </td>
              </tr>
            ))}
            {!loading && reservations.length === 0 && <tr><td colSpan={8} style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,.25)" }}>No reservations yet.</td></tr>}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#161b27", border: `1px solid ${border}`, borderRadius: 16, padding: 32, width: 500, fontFamily: ff }}>
            <h2 style={{ margin: "0 0 24px", fontSize: 18, fontWeight: 700 }}>New Reservation</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {[["Guest Name", "guest", "text", "span 2"], ["Room Number", "room", "text", ""], ["Phone", "phone", "text", ""], ["Check In", "checkIn", "date", ""], ["Check Out", "checkOut", "date", ""]].map(([label, key, type, col]) => (
                <div key={key} style={{ gridColumn: col || undefined }}>
                  <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>{label}</label>
                  <input type={type} value={String((form as Record<string, unknown>)[key] ?? "")} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} style={{ width: "100%", background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff", fontSize: 14, boxSizing: "border-box" }} />
                </div>
              ))}
              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Adults</label>
                <input type="number" value={form.adults} onChange={e => setForm(f => ({ ...f, adults: Number(e.target.value) }))} style={{ width: "100%", background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff", fontSize: 14, boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Children</label>
                <input type="number" value={form.children} onChange={e => setForm(f => ({ ...f, children: Number(e.target.value) }))} style={{ width: "100%", background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff", fontSize: 14, boxSizing: "border-box" }} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
              {error && <div style={{ color: "#fda4af", fontSize: 12, flex: 1 }}>{error}</div>}
              <button onClick={save} style={{ flex: 1, padding: "11px 0", background: "#f97316", border: "none", borderRadius: 8, color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Create Reservation</button>
              <button onClick={() => { setShowModal(false); setError(""); }} style={{ padding: "11px 24px", background: "transparent", border: `1px solid ${border}`, borderRadius: 8, color: "rgba(255,255,255,.6)", fontSize: 14, cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
