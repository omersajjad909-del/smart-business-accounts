"use client";

import toast from "react-hot-toast";

import { useMemo, useState } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";
import {
  mapRestaurantReservationRecords,
  mapRestaurantTableRecords,
  restaurantBg,
  restaurantBorder,
  restaurantFont,
  todayIso,
  type ReservationStatus,
} from "../_shared";

type ReservationForm = {
  guestName: string;
  phone: string;
  tableRef: string;
  guests: number;
  reservationDate: string;
};

const emptyForm: ReservationForm = {
  guestName: "",
  phone: "",
  tableRef: "",
  guests: 2,
  reservationDate: todayIso(),
};

export default function RestaurantReservationsPage() {
  const reservationStore = useBusinessRecords("restaurant_reservation");
  const tableStore = useBusinessRecords("restaurant_table");
  const orderStore = useBusinessRecords("restaurant_order");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ReservationForm>(emptyForm);
  const [formError, setFormError] = useState("");

  const reservations = useMemo(() => mapRestaurantReservationRecords(reservationStore.records), [reservationStore.records]);
  const tables = useMemo(() => mapRestaurantTableRecords(tableStore.records), [tableStore.records]);

  function closeModal() {
    setShowModal(false);
    setEditingId(null);
    setForm(emptyForm);
    setFormError("");
  }

  function editReservation(reservation: (typeof reservations)[number]) {
    if (reservation.status === "cancelled") {
      toast("Cancelled reservations are locked.");
      return;
    }
    setEditingId(reservation.id);
    setForm({
      guestName: reservation.guestName,
      phone: reservation.phone,
      tableRef: reservation.tableRef,
      guests: reservation.guests,
      reservationDate: reservation.reservationDate || todayIso(),
    });
    setShowModal(true);
  }

  function getTableRecord(tableRef: string) {
    return tableStore.records.find((record) => `Table ${Number(record.data?.number || 0)}` === tableRef);
  }

  function hasOtherActiveReservations(tableRef: string, excludeReservationId?: string) {
    return reservations.some((row) => row.tableRef === tableRef && ["booked", "confirmed", "arrived"].includes(row.status) && row.id !== excludeReservationId);
  }

  function hasOpenOrders(tableRef: string) {
    return orderStore.records.some((record) => String(record.data?.tableRef || "") === tableRef && String(record.status || "") !== "closed");
  }

  async function updateTableStatus(tableRef: string, nextStatus: "available" | "occupied" | "reserved" | "cleaning") {
    const tableRecord = getTableRecord(tableRef);
    if (!tableRecord) return;
    await tableStore.update(tableRecord.id, { status: nextStatus });
  }

  async function releaseTableIfFree(tableRef: string, excludeReservationId?: string) {
    if (hasOpenOrders(tableRef)) return;
    if (hasOtherActiveReservations(tableRef, excludeReservationId)) {
      await updateTableStatus(tableRef, "reserved");
      return;
    }
    await updateTableStatus(tableRef, "available");
  }

  async function save() {
    if (!form.guestName.trim()) return setFormError("Guest name is required.");
    if (!form.phone.trim()) return setFormError("Phone number is required.");
    if (!form.tableRef.trim()) return setFormError("Table selection is required.");
    if (form.guests <= 0) return setFormError("Guests must be greater than zero.");
    if (!form.reservationDate) return setFormError("Reservation date is required.");
    const selectedTable = tables.find((table) => `Table ${table.number}` === form.tableRef.trim());
    if (selectedTable && form.guests > selectedTable.capacity) return setFormError("Guests exceed table capacity.");
    setFormError("");

    const current = editingId ? reservations.find((row) => row.id === editingId) : null;
    const payload = {
      title: form.guestName.trim(),
      status: (current?.status || "booked") as ReservationStatus,
      date: form.reservationDate,
      data: {
        phone: form.phone.trim(),
        tableRef: form.tableRef.trim(),
        guests: form.guests,
      },
    };

    if (editingId) {
      await reservationStore.update(editingId, payload);
    } else {
      await reservationStore.create(payload);
    }
    closeModal();
  }

  async function moveReservation(reservation: (typeof reservations)[number], nextStatus: ReservationStatus) {
    if (nextStatus === "arrived" && reservation.status !== "confirmed") {
      toast.success("Only confirmed reservations can be marked arrived.");
      return;
    }
    if (!window.confirm(`Change ${reservation.guestName} to ${nextStatus}?`)) return;

    if (nextStatus === "confirmed") {
      if (hasOpenOrders(reservation.tableRef)) {
        toast.error("This table already has an active order.");
        return;
      }
      if (hasOtherActiveReservations(reservation.tableRef, reservation.id)) {
        toast.error("This table already has another active reservation.");
        return;
      }
      await updateTableStatus(reservation.tableRef, "reserved");
    }

    if (nextStatus === "arrived") {
      await updateTableStatus(reservation.tableRef, "occupied");
    }

    await reservationStore.update(reservation.id, { status: nextStatus });

    if (nextStatus === "cancelled") {
      await releaseTableIfFree(reservation.tableRef, reservation.id);
    }
  }

  async function removeReservation(reservation: (typeof reservations)[number]) {
    if (reservation.status === "arrived") {
      toast.success("Arrived reservations cannot be deleted.");
      return;
    }
    if (!window.confirm(`Delete reservation for ${reservation.guestName}?`)) return;
    await reservationStore.remove(reservation.id);
    await releaseTableIfFree(reservation.tableRef, reservation.id);
  }

  return (
    <div style={{ padding: "28px 32px", color: "#fff", fontFamily: restaurantFont, minHeight: "100vh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 26 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 6px" }}>Restaurant Reservations</h1>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,.45)", margin: 0 }}>Track table bookings from booking to arrival.</p>
        </div>
        <button onClick={() => setShowModal(true)} style={{ padding: "10px 18px", borderRadius: 10, border: "none", background: "#ef4444", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>+ New Reservation</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Booked", value: reservations.filter((row) => row.status === "booked").length, color: "#f59e0b" },
          { label: "Confirmed", value: reservations.filter((row) => row.status === "confirmed").length, color: "#38bdf8" },
          { label: "Arrived", value: reservations.filter((row) => row.status === "arrived").length, color: "#34d399" },
          { label: "Cancelled", value: reservations.filter((row) => row.status === "cancelled").length, color: "#ef4444" },
        ].map((card) => (
          <div key={card.label} style={{ background: restaurantBg, border: `1px solid ${restaurantBorder}`, borderRadius: 14, padding: "18px 20px" }}>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 8 }}>{card.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      <div style={{ background: restaurantBg, border: `1px solid ${restaurantBorder}`, borderRadius: 16, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["Guest", "Phone", "Table", "Guests", "Date", "Status", "Actions"].map((header) => (
                <th key={header} style={{ textAlign: "left", padding: "12px 16px", fontSize: 12, color: "rgba(255,255,255,.45)", borderBottom: `1px solid ${restaurantBorder}` }}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {reservations.map((reservation) => (
              <tr key={reservation.id}>
                <td style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontWeight: 700 }}>{reservation.guestName}</td>
                <td style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>{reservation.phone}</td>
                <td style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>{reservation.tableRef}</td>
                <td style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>{reservation.guests}</td>
                <td style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>{reservation.reservationDate || "-"}</td>
                <td style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", textTransform: "uppercase", fontSize: 11, fontWeight: 700, color: "#fca5a5" }}>{reservation.status}</td>
                <td style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button onClick={() => editReservation(reservation)} style={{ padding: "6px 10px", background: "rgba(99,102,241,.16)", border: "1px solid rgba(99,102,241,.3)", color: "#c7d2fe", borderRadius: 6, fontSize: 11, cursor: "pointer" }}>Edit</button>
                  {reservation.status === "booked" && <button onClick={() => void moveReservation(reservation, "confirmed")} style={{ padding: "6px 10px", background: "rgba(56,189,248,.15)", border: "1px solid rgba(56,189,248,.3)", color: "#38bdf8", borderRadius: 6, fontSize: 11, cursor: "pointer" }}>Confirm</button>}
                  {reservation.status === "confirmed" && <button onClick={() => void moveReservation(reservation, "arrived")} style={{ padding: "6px 10px", background: "rgba(52,211,153,.15)", border: "1px solid rgba(52,211,153,.3)", color: "#34d399", borderRadius: 6, fontSize: 11, cursor: "pointer" }}>Arrived</button>}
                  {reservation.status !== "cancelled" && reservation.status !== "arrived" && <button onClick={() => void moveReservation(reservation, "cancelled")} style={{ padding: "6px 10px", background: "rgba(239,68,68,.12)", border: "1px solid rgba(239,68,68,.25)", color: "#f87171", borderRadius: 6, fontSize: 11, cursor: "pointer" }}>Cancel</button>}
                  <button onClick={() => void removeReservation(reservation)} style={{ padding: "6px 10px", background: "rgba(239,68,68,.12)", border: "1px solid rgba(239,68,68,.25)", color: "#f87171", borderRadius: 6, fontSize: 11, cursor: "pointer" }}>Delete</button>
                </td>
              </tr>
            ))}
            {!reservationStore.loading && reservations.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: 36, textAlign: "center", color: "rgba(255,255,255,.25)" }}>No reservations yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.72)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 40 }}>
          <div style={{ width: 520, background: "#161b27", border: `1px solid ${restaurantBorder}`, borderRadius: 16, padding: 28 }}>
            <h2 style={{ margin: "0 0 18px", fontSize: 18, fontWeight: 800 }}>{editingId ? "Edit Reservation" : "New Reservation"}</h2>
            {formError && <div style={{ marginBottom: 14, padding: "10px 12px", background: "rgba(239,68,68,.12)", border: "1px solid rgba(239,68,68,.26)", borderRadius: 8, color: "#fca5a5", fontSize: 12 }}>{formError}</div>}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Guest Name</label>
                <input value={form.guestName} onChange={(event) => setForm((prev) => ({ ...prev, guestName: event.target.value }))} style={{ width: "100%", background: restaurantBg, border: `1px solid ${restaurantBorder}`, borderRadius: 8, padding: "10px 12px", color: "#fff", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Phone</label>
                <input value={form.phone} onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))} style={{ width: "100%", background: restaurantBg, border: `1px solid ${restaurantBorder}`, borderRadius: 8, padding: "10px 12px", color: "#fff", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Table</label>
                <select value={form.tableRef} onChange={(event) => setForm((prev) => ({ ...prev, tableRef: event.target.value }))} style={{ width: "100%", background: restaurantBg, border: `1px solid ${restaurantBorder}`, borderRadius: 8, padding: "10px 12px", color: "#fff" }}>
                  <option value="">Select table</option>
                  {tables.map((table) => (
                    <option key={table.id} value={`Table ${table.number}`}>Table {table.number} ({table.capacity} seats)</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Guests</label>
                <input type="number" min={1} value={form.guests} onChange={(event) => setForm((prev) => ({ ...prev, guests: Number(event.target.value) }))} style={{ width: "100%", background: restaurantBg, border: `1px solid ${restaurantBorder}`, borderRadius: 8, padding: "10px 12px", color: "#fff", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Reservation Date</label>
                <input type="date" value={form.reservationDate} onChange={(event) => setForm((prev) => ({ ...prev, reservationDate: event.target.value }))} style={{ width: "100%", background: restaurantBg, border: `1px solid ${restaurantBorder}`, borderRadius: 8, padding: "10px 12px", color: "#fff", boxSizing: "border-box" }} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 18 }}>
              <button onClick={save} style={{ flex: 1, padding: "11px 0", background: "#ef4444", border: "none", borderRadius: 8, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>{editingId ? "Update Reservation" : "Create Reservation"}</button>
              <button onClick={closeModal} style={{ padding: "11px 20px", background: "transparent", border: `1px solid ${restaurantBorder}`, borderRadius: 8, color: "rgba(255,255,255,.65)", cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
