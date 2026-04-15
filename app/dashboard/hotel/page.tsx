"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { HotelControlCenter, fetchJson, hotelBg, hotelBorder, hotelFont, hotelMuted } from "./_shared";

const emptyState: HotelControlCenter = {
  summary: { rooms: 0, occupiedRooms: 0, occupancyRate: 0, checkedInGuests: 0, reservedGuests: 0, serviceRevenue: 0, pendingHousekeeping: 0, maintenanceRooms: 0 },
  rooms: [],
  reservations: [],
  housekeeping: [],
  serviceOrders: [],
};

export default function HotelOverviewPage() {
  const [data, setData] = useState(emptyState);

  useEffect(() => {
    fetchJson("/api/hotel/control-center", emptyState).then(setData);
  }, []);

  const { summary, rooms, reservations, housekeeping, serviceOrders } = data;

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
            <Link prefetch={false} key={item.href} href={item.href} style={{ padding: "10px 14px", borderRadius: 10, border: `1px solid ${hotelBorder}`, background: hotelBg, color: "#fdba74", textDecoration: "none", fontSize: 12, fontWeight: 700 }}>
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Rooms", value: summary.rooms, color: "#fb923c" },
          { label: "Occupancy", value: `${summary.occupancyRate}%`, color: "#34d399" },
          { label: "Checked-In Guests", value: summary.checkedInGuests, color: "#60a5fa" },
          { label: "Room Service Revenue", value: `Rs. ${summary.serviceRevenue.toLocaleString()}`, color: "#f59e0b" },
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
              { label: "Cleaning tasks", value: summary.pendingHousekeeping, color: "#f59e0b" },
              { label: "Preparing room service", value: serviceOrders.filter((row) => row.status === "preparing").length, color: "#60a5fa" },
              { label: "Maintenance rooms", value: summary.maintenanceRooms, color: "#f87171" },
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
