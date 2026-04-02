"use client";

import Link from "next/link";
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
} from "./_shared";

export default function HotelOverviewPage() {
  const roomStore = useBusinessRecords("hotel_room");
  const reservationStore = useBusinessRecords("hotel_reservation");
  const housekeepingStore = useBusinessRecords("housekeeping_task");
  const serviceStore = useBusinessRecords("room_service_order");

  const rooms = useMemo(() => mapRoomRecords(roomStore.records), [roomStore.records]);
  const reservations = useMemo(() => mapReservationRecords(reservationStore.records), [reservationStore.records]);
  const housekeeping = useMemo(() => mapHousekeepingRecords(housekeepingStore.records), [housekeepingStore.records]);
  const serviceOrders = useMemo(() => mapRoomServiceRecords(serviceStore.records), [serviceStore.records]);

  const occupied = rooms.filter((row) => row.status === "occupied").length;
  const occupancyRate = rooms.length ? Math.round((occupied / rooms.length) * 100) : 0;
  const checkedIn = reservations.filter((row) => row.status === "checked_in").length;
  const serviceRevenue = serviceOrders.filter((row) => row.status === "delivered").reduce((sum, row) => sum + row.amount, 0);

  return (
    <div style={{ minHeight: "100vh", padding: "28px 32px", color: "#fff", fontFamily: hotelFont }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20, flexWrap: "wrap", marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: "0 0 6px", fontSize: 26, fontWeight: 800 }}>Hotel Command Center</h1>
          <p style={{ margin: 0, fontSize: 13, color: hotelMuted }}>Room inventory, live stays, housekeeping load, and service revenue in one view.</p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {[
            { label: "Rooms", href: "/dashboard/hotel/rooms" },
            { label: "Front Desk", href: "/dashboard/hotel/front-desk" },
            { label: "Housekeeping", href: "/dashboard/hotel/housekeeping" },
            { label: "Room Service", href: "/dashboard/hotel/room-service" },
            { label: "Analytics", href: "/dashboard/hotel/analytics" },
          ].map((item) => (
            <Link key={item.href} href={item.href} style={{ padding: "10px 14px", borderRadius: 10, border: `1px solid ${hotelBorder}`, background: hotelBg, color: "#fdba74", textDecoration: "none", fontSize: 12, fontWeight: 700 }}>
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Rooms", value: rooms.length, color: "#fb923c" },
          { label: "Occupancy", value: `${occupancyRate}%`, color: "#34d399" },
          { label: "Checked-In Guests", value: checkedIn, color: "#60a5fa" },
          { label: "Room Service Revenue", value: `Rs. ${serviceRevenue.toLocaleString()}`, color: "#f59e0b" },
        ].map((card) => (
          <div key={card.label} style={{ background: hotelBg, border: `1px solid ${hotelBorder}`, borderRadius: 14, padding: "18px 20px" }}>
            <div style={{ fontSize: 12, color: hotelMuted, marginBottom: 8 }}>{card.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.05fr .95fr", gap: 18 }}>
        <div style={{ background: hotelBg, border: `1px solid ${hotelBorder}`, borderRadius: 16, overflow: "hidden" }}>
          <div style={{ padding: "16px 18px", borderBottom: `1px solid ${hotelBorder}`, fontSize: 15, fontWeight: 800 }}>Stay Watchlist</div>
          <div style={{ padding: 18, display: "grid", gap: 10 }}>
            {reservations.filter((row) => row.status !== "checked_out").slice(0, 6).map((reservation) => (
              <div key={reservation.id} style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.05)" }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{reservation.guest}</div>
                <div style={{ fontSize: 12, color: hotelMuted, marginTop: 4 }}>Room {reservation.room} · {reservation.checkIn} to {reservation.checkOut}</div>
                <div style={{ fontSize: 12, color: "#93c5fd", marginTop: 6 }}>{reservation.status.replace("_", " ")}</div>
              </div>
            ))}
            {reservations.filter((row) => row.status !== "checked_out").length === 0 && <div style={{ color: "rgba(255,255,255,.28)" }}>No active stays right now.</div>}
          </div>
        </div>

        <div style={{ background: hotelBg, border: `1px solid ${hotelBorder}`, borderRadius: 16, overflow: "hidden" }}>
          <div style={{ padding: "16px 18px", borderBottom: `1px solid ${hotelBorder}`, fontSize: 15, fontWeight: 800 }}>Operations Snapshot</div>
          <div style={{ padding: 18, display: "grid", gap: 10 }}>
            {[
              { label: "Available rooms", value: rooms.filter((row) => row.status === "available").length, color: "#34d399" },
              { label: "Cleaning tasks", value: housekeeping.filter((row) => row.status !== "completed").length, color: "#f59e0b" },
              { label: "Preparing room service", value: serviceOrders.filter((row) => row.status === "preparing").length, color: "#60a5fa" },
              { label: "Maintenance rooms", value: rooms.filter((row) => row.status === "maintenance").length, color: "#f87171" },
            ].map((row) => (
              <div key={row.label} style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.05)" }}>
                <span style={{ fontSize: 13, color: hotelMuted }}>{row.label}</span>
                <span style={{ fontSize: 15, fontWeight: 800, color: row.color }}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
