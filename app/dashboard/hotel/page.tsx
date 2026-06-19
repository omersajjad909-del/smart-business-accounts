"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { HotelControlCenter, fetchJson, hotelFont, hotelMuted } from "./_shared";

const emptyState: HotelControlCenter = {
  summary: {
    rooms: 0, occupiedRooms: 0, occupancyRate: 0, checkedInGuests: 0, reservedGuests: 0,
    serviceRevenue: 0, pendingHousekeeping: 0, maintenanceRooms: 0,
    todayCheckIns: 0, todayCheckOuts: 0, expectedArrivals: 0, openComplaints: 0,
    laundryPending: 0, laundryInProgress: 0, laundryReady: 0, revenueToday: 0, pendingReservations: 0,
  },
  rooms: [], reservations: [], housekeeping: [], serviceOrders: [], laundry: [], complaints: [],
};

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  available:   { bg: "#16a34a", text: "#fff",     label: "AVAILABLE" },
  occupied:    { bg: "#dc2626", text: "#fff",     label: "OCCUPIED" },
  reserved:    { bg: "#ca8a04", text: "#fff",     label: "RESERVED" },
  cleaning:    { bg: "#0891b2", text: "#fff",     label: "CLEANING" },
  maintenance: { bg: "#ea580c", text: "#fff",     label: "MAINT" },
  blocked:     { bg: "#374151", text: "#9ca3af",  label: "BLOCKED" },
};

export default function HotelOverviewPage() {
  const [data, setData] = useState(emptyState);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJson("/api/hotel/control-center", emptyState).then(d => { setData(d); setLoading(false); });
  }, []);

  const { summary, rooms, reservations, serviceOrders, laundry } = data;
  const today = new Date().toISOString().slice(0, 10);

  const revenueToday = serviceOrders
    .filter(o => o.status === "delivered")
    .reduce((s, o) => s + o.amount, 0);

  return (
    <div style={{ minHeight: "100vh", padding: "28px 32px", color: "#fff", fontFamily: hotelFont }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 800 }}>🏨 Hotel Command Center</h1>
          <p style={{ margin: 0, fontSize: 13, color: hotelMuted }}>
            {new Date().toLocaleDateString("en-PK", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {[
            { label: "Front Desk", href: "/dashboard/hotel/front-desk" },
            { label: "Rooms", href: "/dashboard/hotel/rooms" },
            { label: "Housekeeping", href: "/dashboard/hotel/housekeeping" },
            { label: "Room Service", href: "/dashboard/hotel/room-service" },
            { label: "Laundry", href: "/dashboard/hotel/laundry" },
            { label: "Complaints", href: "/dashboard/hotel/complaints" },
            { label: "Analytics", href: "/dashboard/hotel/analytics" },
          ].map(item => (
            <Link key={item.href} prefetch={false} href={item.href}
              style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.04)", color: "#fdba74", textDecoration: "none", fontSize: 12, fontWeight: 600 }}>
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Row 1: Main Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 12 }}>
        {[
          { label: "Today's Check-Ins",   value: summary.todayCheckIns,      icon: "🚪", color: "#34d399" },
          { label: "Today's Check-Outs",  value: summary.todayCheckOuts,     icon: "🔑", color: "#60a5fa" },
          { label: "Expected Arrivals",   value: summary.expectedArrivals,   icon: "🧳", color: "#f59e0b" },
          { label: "Open Complaints",     value: summary.openComplaints,     icon: "⚠️", color: "#f87171" },
        ].map(c => (
          <div key={c.label} style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 14, padding: "18px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 12, color: hotelMuted, marginBottom: 6 }}>{c.label}</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: c.color, lineHeight: 1 }}>{loading ? "—" : c.value}</div>
            </div>
            <div style={{ fontSize: 28, opacity: 0.6 }}>{c.icon}</div>
          </div>
        ))}
      </div>

      {/* Row 2: Secondary Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 12 }}>
        {[
          { label: "Occupancy",            value: `${summary.occupancyRate}%\n${summary.occupiedRooms}/${summary.rooms} rooms`, icon: "📊", color: "#a78bfa" },
          { label: "Revenue Today",        value: `Rs. ${revenueToday.toLocaleString()}`,   icon: "💰", color: "#34d399" },
          { label: "Checked-In Guests",    value: summary.checkedInGuests,    icon: "🛏️", color: "#60a5fa" },
          { label: "Pending Reservations", value: summary.pendingReservations, icon: "📋", color: "#f59e0b" },
        ].map(c => (
          <div key={c.label} style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 14, padding: "18px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 12, color: hotelMuted, marginBottom: 6 }}>{c.label}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: c.color, lineHeight: 1.2, whiteSpace: "pre-line" }}>{loading ? "—" : c.value}</div>
            </div>
            <div style={{ fontSize: 26, opacity: 0.6 }}>{c.icon}</div>
          </div>
        ))}
      </div>

      {/* Row 3: Laundry Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Laundry Pending",     value: summary.laundryPending,    sub: "Awaiting pickup/processing", icon: "🧺", color: "#f59e0b" },
          { label: "In Progress",         value: summary.laundryInProgress, sub: "Washing / Ironing",          icon: "🫧", color: "#60a5fa" },
          { label: "Ready to Deliver",    value: summary.laundryReady,      sub: "Cleaned & folded",           icon: "✅", color: "#34d399" },
        ].map(c => (
          <div key={c.label} style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 14, padding: "18px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 12, color: hotelMuted, marginBottom: 4 }}>{c.label}</div>
              <div style={{ fontSize: 32, fontWeight: 800, color: c.color, lineHeight: 1, marginBottom: 4 }}>{loading ? "—" : c.value}</div>
              <Link prefetch={false} href="/dashboard/hotel/laundry" style={{ fontSize: 11, color: c.color, textDecoration: "none", opacity: 0.8 }}>Go to Laundry →</Link>
            </div>
            <div style={{ fontSize: 32, opacity: 0.5 }}>{c.icon}</div>
          </div>
        ))}
      </div>

      {/* Room Status Board */}
      <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, padding: "20px 24px", marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
          <div style={{ fontSize: 15, fontWeight: 800 }}>🏠 Room Status Board <span style={{ fontSize: 12, color: hotelMuted, fontWeight: 400, marginLeft: 6 }}>{rooms.length} rooms</span></div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {Object.entries(STATUS_COLORS).map(([key, v]) => (
              <span key={key} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: hotelMuted }}>
                <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 3, background: v.bg }} />
                {v.label}
              </span>
            ))}
          </div>
        </div>
        {rooms.length === 0 ? (
          <div style={{ textAlign: "center", padding: "32px 0", color: hotelMuted, fontSize: 13 }}>
            No rooms added yet. <Link prefetch={false} href="/dashboard/hotel/rooms" style={{ color: "#f97316", textDecoration: "none" }}>Add rooms →</Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {rooms.map(room => {
              const sc = STATUS_COLORS[room.status] || STATUS_COLORS.available;
              return (
                <div key={room.id}
                  style={{ background: sc.bg, borderRadius: 10, padding: "10px 8px", minWidth: 64, textAlign: "center", cursor: "default" }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: sc.text, lineHeight: 1 }}>{room.number}</div>
                  <div style={{ fontSize: 8, fontWeight: 700, color: sc.text, opacity: 0.85, marginTop: 4, letterSpacing: ".05em" }}>{sc.label}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom: Stay Watchlist + Operations */}
      <div style={{ display: "grid", gridTemplateColumns: "1.1fr .9fr", gap: 18 }}>
        <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, overflow: "hidden" }}>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,.07)", fontSize: 14, fontWeight: 800 }}>Stay Watchlist</div>
          <div style={{ padding: 16, display: "grid", gap: 8 }}>
            {reservations.filter(r => r.status !== "checked_out").slice(0, 6).map(r => (
              <div key={r.id} style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.05)" }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{r.guest}</div>
                <div style={{ fontSize: 11, color: hotelMuted, marginTop: 2 }}>Room {r.room} · {r.checkIn} → {r.checkOut}</div>
                <div style={{ fontSize: 11, color: "#93c5fd", marginTop: 4 }}>{r.status.replace(/_/g, " ")}</div>
              </div>
            ))}
            {reservations.filter(r => r.status !== "checked_out").length === 0 && (
              <div style={{ color: hotelMuted, fontSize: 12, padding: "12px 0" }}>No active stays right now.</div>
            )}
          </div>
        </div>

        <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, overflow: "hidden" }}>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,.07)", fontSize: 14, fontWeight: 800 }}>Operations Snapshot</div>
          <div style={{ padding: 16, display: "grid", gap: 8 }}>
            {[
              { label: "Available rooms",        value: rooms.filter(r => r.status === "available").length,  color: "#34d399" },
              { label: "Cleaning tasks active",  value: summary.pendingHousekeeping,                         color: "#f59e0b" },
              { label: "Room service preparing", value: serviceOrders.filter(r => r.status === "preparing").length, color: "#60a5fa" },
              { label: "Maintenance rooms",      value: summary.maintenanceRooms,                            color: "#f87171" },
              { label: "Laundry in queue",       value: summary.laundryPending + summary.laundryInProgress,  color: "#a78bfa" },
            ].map(row => (
              <div key={row.label} style={{ display: "flex", justifyContent: "space-between", padding: "9px 12px", borderRadius: 10, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.05)" }}>
                <span style={{ fontSize: 12, color: hotelMuted }}>{row.label}</span>
                <span style={{ fontSize: 15, fontWeight: 800, color: row.color }}>{loading ? "—" : row.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}
