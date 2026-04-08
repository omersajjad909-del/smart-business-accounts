"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchJson, transportBg, transportBorder, transportFont, transportMuted, type TransportControlCenter } from "./_shared";

const emptyState: TransportControlCenter = {
  summary: { fleetSize: 0, availableVehicles: 0, maintenanceVehicles: 0, drivers: 0, driversOnDuty: 0, trips: 0, activeTrips: 0, completedTrips: 0, dispatches: 0, activeDispatches: 0, fuelCost: 0, maintenanceCost: 0, expenseBooked: 0, netRevenue: 0 },
  vehicles: [],
  drivers: [],
  trips: [],
  fuelLogs: [],
  dispatches: [],
  maintenance: [],
  expenses: [],
};

export default function TransportOverviewPage() {
  const [data, setData] = useState(emptyState);

  useEffect(() => {
    fetchJson("/api/transport/control-center", emptyState).then(setData);
  }, []);

  const { summary, trips } = data;

  return (
    <div style={{ minHeight: "100vh", padding: "28px 32px", color: "#fff", fontFamily: transportFont }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20, flexWrap: "wrap", marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: "0 0 6px", fontSize: 26, fontWeight: 800 }}>Transport Command Center</h1>
          <p style={{ margin: 0, fontSize: 13, color: transportMuted }}>Fleet readiness, driver coverage, active trips, and fuel spend in one view.</p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {[
            { label: "Fleet", href: "/dashboard/transport/fleet" },
            { label: "Trips", href: "/dashboard/transport/trips" },
            { label: "Dispatch", href: "/dashboard/transport/dispatch" },
            { label: "Drivers", href: "/dashboard/transport/drivers" },
            { label: "Fuel", href: "/dashboard/transport/fuel" },
            { label: "Maintenance", href: "/dashboard/transport/maintenance" },
            { label: "Expenses", href: "/dashboard/transport/expenses" },
            { label: "Analytics", href: "/dashboard/transport/analytics" },
          ].map((item) => (
            <Link key={item.href} href={item.href} style={{ padding: "10px 14px", borderRadius: 10, border: `1px solid ${transportBorder}`, background: transportBg, color: "#93c5fd", textDecoration: "none", fontSize: 12, fontWeight: 700 }}>
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,minmax(0,1fr))", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Fleet Size", value: summary.fleetSize, color: "#60a5fa" },
          { label: "Active Trips", value: summary.activeTrips, color: "#22c55e" },
          { label: "Drivers", value: summary.drivers, color: "#f59e0b" },
          { label: "Fuel Cost", value: `Rs. ${summary.fuelCost.toLocaleString()}`, color: "#f87171" },
          { label: "Net Revenue", value: `Rs. ${summary.netRevenue.toLocaleString()}`, color: "#34d399" },
        ].map((card) => (
          <div key={card.label} style={{ background: transportBg, border: `1px solid ${transportBorder}`, borderRadius: 14, padding: "18px 20px" }}>
            <div style={{ fontSize: 12, color: transportMuted, marginBottom: 8 }}>{card.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.05fr .95fr", gap: 18 }}>
        <div style={{ background: transportBg, border: `1px solid ${transportBorder}`, borderRadius: 16, overflow: "hidden" }}>
          <div style={{ padding: "16px 18px", borderBottom: `1px solid ${transportBorder}`, fontSize: 15, fontWeight: 800 }}>Trip Watchlist</div>
          <div style={{ padding: 18, display: "grid", gap: 10 }}>
            {trips.filter((row) => row.status !== "completed" && row.status !== "cancelled").slice(0, 6).map((row) => (
              <div key={row.id} style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.05)" }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{row.tripNo}</div>
                <div style={{ fontSize: 12, color: transportMuted, marginTop: 4 }}>{row.vehicle || "-"} | {row.driver || "-"}</div>
                <div style={{ fontSize: 12, color: "#93c5fd", marginTop: 6 }}>{row.from} to {row.to}</div>
              </div>
            ))}
            {trips.filter((row) => row.status !== "completed" && row.status !== "cancelled").length === 0 && <div style={{ color: "rgba(255,255,255,.28)" }}>No active transport movement right now.</div>}
          </div>
        </div>

        <div style={{ background: transportBg, border: `1px solid ${transportBorder}`, borderRadius: 16, overflow: "hidden" }}>
          <div style={{ padding: "16px 18px", borderBottom: `1px solid ${transportBorder}`, fontSize: 15, fontWeight: 800 }}>Operations Snapshot</div>
          <div style={{ padding: 18, display: "grid", gap: 10 }}>
            {[
              { label: "Vehicles available", value: summary.availableVehicles, color: "#22c55e" },
              { label: "Vehicles in maintenance", value: summary.maintenanceVehicles, color: "#f59e0b" },
              { label: "Drivers on duty", value: summary.driversOnDuty, color: "#60a5fa" },
              { label: "Active dispatches", value: summary.activeDispatches, color: "#38bdf8" },
              { label: "Maintenance cost", value: `Rs. ${summary.maintenanceCost.toLocaleString()}`, color: "#fb7185" },
              { label: "Trip expenses booked", value: `Rs. ${summary.expenseBooked.toLocaleString()}`, color: "#f97316" },
            ].map((row) => (
              <div key={row.label} style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.05)" }}>
                <span style={{ fontSize: 13, color: transportMuted }}>{row.label}</span>
                <span style={{ fontSize: 15, fontWeight: 800, color: row.color }}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
