"use client";

import { useMemo } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";
import {
  hotelBg,
  hotelBorder,
  hotelFont,
  hotelMuted,
  mapHousekeepingRecords,
  mapReservationRecords,
  mapRoomRecords,
  mapRoomServiceRecords,
} from "../_shared";

export default function HotelAnalyticsPage() {
  const roomStore = useBusinessRecords("hotel_room");
  const reservationStore = useBusinessRecords("hotel_reservation");
  const housekeepingStore = useBusinessRecords("housekeeping_task");
  const serviceStore = useBusinessRecords("room_service_order");

  const rooms = useMemo(() => mapRoomRecords(roomStore.records), [roomStore.records]);
  const reservations = useMemo(() => mapReservationRecords(reservationStore.records), [reservationStore.records]);
  const housekeeping = useMemo(() => mapHousekeepingRecords(housekeepingStore.records), [housekeepingStore.records]);
  const serviceOrders = useMemo(() => mapRoomServiceRecords(serviceStore.records), [serviceStore.records]);

  const roomMix = rooms.reduce<Record<string, number>>((acc, row) => {
    acc[row.type] = (acc[row.type] || 0) + 1;
    return acc;
  }, {});

  const serviceByRoom = serviceOrders.reduce<Record<string, number>>((acc, row) => {
    acc[row.room] = (acc[row.room] || 0) + row.amount;
    return acc;
  }, {});

  return (
    <div style={{ minHeight: "100vh", padding: "28px 32px", color: "#fff", fontFamily: hotelFont }}>
      <div style={{ marginBottom: 26 }}>
        <h1 style={{ margin: "0 0 6px", fontSize: 24, fontWeight: 800 }}>Hotel Analytics</h1>
        <p style={{ margin: 0, fontSize: 13, color: hotelMuted }}>Room mix, active stays, housekeeping load, and service demand.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 18 }}>
        <div style={{ background: hotelBg, border: `1px solid ${hotelBorder}`, borderRadius: 16, padding: 18 }}>
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 14 }}>Room Mix</div>
          <div style={{ display: "grid", gap: 10 }}>
            {Object.entries(roomMix).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
              <div key={type} style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.05)" }}>
                <span style={{ fontSize: 13 }}>{type}</span>
                <span style={{ fontSize: 15, fontWeight: 800, color: "#fdba74" }}>{count}</span>
              </div>
            ))}
            {Object.keys(roomMix).length === 0 && <div style={{ color: "rgba(255,255,255,.28)" }}>No room data yet.</div>}
          </div>
        </div>

        <div style={{ background: hotelBg, border: `1px solid ${hotelBorder}`, borderRadius: 16, padding: 18 }}>
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 14 }}>Reservation Health</div>
          <div style={{ display: "grid", gap: 10 }}>
            {[
              { label: "Reserved", value: reservations.filter((row) => row.status === "reserved").length, color: "#818cf8" },
              { label: "Checked in", value: reservations.filter((row) => row.status === "checked_in").length, color: "#34d399" },
              { label: "Checked out", value: reservations.filter((row) => row.status === "checked_out").length, color: "#94a3b8" },
              { label: "Pending housekeeping", value: housekeeping.filter((row) => row.status !== "completed").length, color: "#f59e0b" },
            ].map((row) => (
              <div key={row.label} style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.05)" }}>
                <span style={{ fontSize: 13, color: hotelMuted }}>{row.label}</span>
                <span style={{ fontSize: 15, fontWeight: 800, color: row.color }}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ background: hotelBg, border: `1px solid ${hotelBorder}`, borderRadius: 16, padding: 18 }}>
        <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 14 }}>Room Service Revenue by Room</div>
        <div style={{ display: "grid", gap: 10 }}>
          {Object.entries(serviceByRoom).sort((a, b) => b[1] - a[1]).map(([room, amount]) => (
            <div key={room} style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.05)" }}>
              <span style={{ fontSize: 13 }}>Room {room}</span>
              <span style={{ fontSize: 15, fontWeight: 800, color: "#34d399" }}>Rs. {amount.toLocaleString()}</span>
            </div>
          ))}
          {Object.keys(serviceByRoom).length === 0 && <div style={{ color: "rgba(255,255,255,.28)" }}>No delivered room service yet.</div>}
        </div>
      </div>
    </div>
  );
}
