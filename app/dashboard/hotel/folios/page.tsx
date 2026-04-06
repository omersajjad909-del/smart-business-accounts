"use client";

import toast from "react-hot-toast";

import { useMemo, useState } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";
import { hotelBg, hotelBorder, hotelFont, hotelMuted, mapHotelFolioRecords, mapReservationRecords, mapRoomServiceRecords, todayIso } from "../_shared";

export default function HotelFoliosPage() {
  const folioStore = useBusinessRecords("hotel_folio");
  const reservationStore = useBusinessRecords("hotel_reservation");
  const serviceStore = useBusinessRecords("room_service_order");
  const { records, loading, create, update } = folioStore;
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ guest: "", room: "", charges: 0, taxes: 0, paid: 0, checkOut: todayIso() });

  const folios = useMemo(() => mapHotelFolioRecords(records), [records]);
  const reservations = useMemo(() => mapReservationRecords(reservationStore.records), [reservationStore.records]);
  const serviceOrders = useMemo(() => mapRoomServiceRecords(serviceStore.records), [serviceStore.records]);

  async function save() {
    if (!form.guest.trim() || !form.room.trim()) {
      setError("Guest and room are required.");
      return;
    }
    if (form.charges <= 0) {
      setError("Charges must be greater than zero.");
      return;
    }
    const reservation = reservations.find((row) => row.guest === form.guest && row.room === form.room && row.status === "checked_out");
    if (!reservation) {
      setError("Create folio only for a checked-out stay.");
      return;
    }
    if (folios.some((row) => row.guest === form.guest && row.room === form.room && row.status !== "closed")) {
      setError("An open folio already exists for this guest stay.");
      return;
    }
    const serviceCharges = serviceOrders.filter((row) => row.room === form.room && row.status === "delivered").reduce((sum, row) => sum + row.amount, 0);
    await create({
      title: form.guest.trim(),
      status: "open",
      amount: form.charges,
      date: form.checkOut,
      data: {
        room: form.room.trim(),
        serviceCharges,
        taxes: form.taxes,
        paid: form.paid,
      },
    });
    setShowModal(false);
    setError("");
    setForm({ guest: "", room: "", charges: 0, taxes: 0, paid: 0, checkOut: todayIso() });
  }

  async function closeFolio(id: string) {
    const row = folios.find((folio) => folio.id === id);
    if (!row) return;
    const total = row.charges + row.serviceCharges + row.taxes;
    if (row.paid < total) {
      toast.error("Folio can only close after full payment.");
      return;
    }
    await update(id, { status: "closed" });
  }

  return (
    <div style={{ minHeight: "100vh", padding: "28px 32px", color: "#fff", fontFamily: hotelFont }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: "0 0 6px", fontSize: 24, fontWeight: 800 }}>Billing Folios</h1>
          <p style={{ margin: 0, fontSize: 13, color: hotelMuted }}>Guest folios with stay charges, room service, taxes, and payment closeout.</p>
        </div>
        <button onClick={() => setShowModal(true)} style={{ padding: "10px 18px", borderRadius: 10, border: "none", background: "#f97316", color: "#fff", fontWeight: 700, cursor: "pointer" }}>New Folio</button>
      </div>

      <div style={{ background: hotelBg, border: `1px solid ${hotelBorder}`, borderRadius: 14, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr>{["Guest", "Room", "Charges", "Service", "Taxes", "Paid", "Checkout", "Status", "Action"].map((head) => (
            <th key={head} style={{ textAlign: "left", padding: "12px 16px", borderBottom: `1px solid ${hotelBorder}`, fontSize: 12, color: hotelMuted }}>{head}</th>
          ))}</tr></thead>
          <tbody>
            {folios.map((row) => (
              <tr key={row.id}>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontWeight: 700 }}>{row.guest}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>{row.room}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>Rs. {row.charges.toLocaleString()}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>Rs. {row.serviceCharges.toLocaleString()}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>Rs. {row.taxes.toLocaleString()}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", color: "#34d399" }}>Rs. {row.paid.toLocaleString()}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>{row.checkOut}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>{row.status}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>
                  {row.status === "open" && <button onClick={() => closeFolio(row.id)} style={{ padding: "5px 10px", borderRadius: 6, background: "rgba(52,211,153,.15)", border: "1px solid rgba(52,211,153,.3)", color: "#34d399", cursor: "pointer" }}>Close</button>}
                </td>
              </tr>
            ))}
            {!loading && folios.length === 0 && <tr><td colSpan={9} style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,.25)" }}>No folios yet.</td></tr>}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.72)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 560, background: "#161b27", border: `1px solid ${hotelBorder}`, borderRadius: 16, padding: 28 }}>
            <h2 style={{ margin: "0 0 18px", fontSize: 18, fontWeight: 800 }}>New Folio</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {[
                ["Guest", "guest", "text"],
                ["Room", "room", "text"],
                ["Stay Charges", "charges", "number"],
                ["Taxes", "taxes", "number"],
                ["Paid", "paid", "number"],
                ["Checkout", "checkOut", "date"],
              ].map(([label, key, type]) => (
                <div key={key}>
                  <label style={{ display: "block", marginBottom: 6, fontSize: 12, color: hotelMuted }}>{label}</label>
                  <input type={type} value={String((form as Record<string, unknown>)[key] ?? "")} onChange={(e) => setForm((prev) => ({ ...prev, [key]: type === "number" ? Number(e.target.value) : e.target.value }))} style={{ width: "100%", padding: "10px 12px", background: "#111827", border: `1px solid ${hotelBorder}`, borderRadius: 8, color: "#fff" }} />
                </div>
              ))}
            </div>
            {error && <div style={{ marginTop: 12, color: "#fda4af", fontSize: 12 }}>{error}</div>}
            <div style={{ display: "flex", gap: 12, marginTop: 18 }}>
              <button onClick={save} style={{ flex: 1, padding: "11px 0", borderRadius: 8, border: "none", background: "#f97316", color: "#fff", fontWeight: 700, cursor: "pointer" }}>Save</button>
              <button onClick={() => { setShowModal(false); setError(""); }} style={{ padding: "11px 18px", borderRadius: 8, border: `1px solid ${hotelBorder}`, background: "transparent", color: "#cbd5e1", cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
