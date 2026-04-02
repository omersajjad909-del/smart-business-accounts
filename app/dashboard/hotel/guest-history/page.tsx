"use client";

import { useMemo } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";
import { hotelBg, hotelBorder, hotelFont, hotelMuted, mapGuestHistoryRecords, mapReservationRecords } from "../_shared";

export default function HotelGuestHistoryPage() {
  const historyStore = useBusinessRecords("hotel_guest_history");
  const reservationStore = useBusinessRecords("hotel_reservation");
  const { records, loading } = historyStore;
  const history = useMemo(() => mapGuestHistoryRecords(records), [records]);
  const reservations = useMemo(() => mapReservationRecords(reservationStore.records), [reservationStore.records]);

  const liveGuests = reservations.filter((row) => row.status === "checked_in");

  return (
    <div style={{ minHeight: "100vh", padding: "28px 32px", color: "#fff", fontFamily: hotelFont }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: "0 0 6px", fontSize: 24, fontWeight: 800 }}>Guest History</h1>
        <p style={{ margin: 0, fontSize: 13, color: hotelMuted }}>Repeat guests, stay frequency, live arrivals, and guest relationship notes.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr .9fr", gap: 18 }}>
        <div style={{ background: hotelBg, border: `1px solid ${hotelBorder}`, borderRadius: 14, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>{["Guest", "Room", "Visits", "Last Stay", "Phone", "Total Spend", "Notes"].map((head) => (
              <th key={head} style={{ textAlign: "left", padding: "12px 16px", borderBottom: `1px solid ${hotelBorder}`, fontSize: 12, color: hotelMuted }}>{head}</th>
            ))}</tr></thead>
            <tbody>
              {history.map((row) => (
                <tr key={row.id}>
                  <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontWeight: 700 }}>{row.guest}</td>
                  <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>{row.room}</td>
                  <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>{row.visits}</td>
                  <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>{row.lastStay}</td>
                  <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>{row.phone || "—"}</td>
                  <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", color: "#34d399" }}>Rs. {row.totalSpend.toLocaleString()}</td>
                  <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>{row.notes || "—"}</td>
                </tr>
              ))}
              {!loading && history.length === 0 && <tr><td colSpan={7} style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,.25)" }}>No guest history yet.</td></tr>}
            </tbody>
          </table>
        </div>

        <div style={{ background: hotelBg, border: `1px solid ${hotelBorder}`, borderRadius: 16, padding: 18 }}>
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 14 }}>Live In-House Guests</div>
          <div style={{ display: "grid", gap: 10 }}>
            {liveGuests.map((row) => (
              <div key={row.id} style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.05)" }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{row.guest}</div>
                <div style={{ fontSize: 12, color: hotelMuted, marginTop: 4 }}>Room {row.room} · {row.checkIn} to {row.checkOut}</div>
                <div style={{ fontSize: 12, color: "#93c5fd", marginTop: 6 }}>{row.phone || "No phone"}</div>
              </div>
            ))}
            {liveGuests.length === 0 && <div style={{ color: "rgba(255,255,255,.28)" }}>No guests currently checked in.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
