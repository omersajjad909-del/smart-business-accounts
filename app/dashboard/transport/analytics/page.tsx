"use client";

import { useMemo } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";
import {
  mapFuelRecords,
  mapTripRecords,
  mapVehicleRecords,
  transportBg,
  transportBorder,
  transportFont,
  transportMuted,
} from "../_shared";

export default function TransportAnalyticsPage() {
  const fleetStore = useBusinessRecords("vehicle");
  const tripStore = useBusinessRecords("trip");
  const fuelStore = useBusinessRecords("fuel_log");

  const vehicles = useMemo(() => mapVehicleRecords(fleetStore.records), [fleetStore.records]);
  const trips = useMemo(() => mapTripRecords(tripStore.records), [tripStore.records]);
  const fuelLogs = useMemo(() => mapFuelRecords(fuelStore.records), [fuelStore.records]);

  const typeMix = useMemo(() => {
    const bucket = new Map<string, number>();
    vehicles.forEach((row) => bucket.set(row.type, (bucket.get(row.type) || 0) + 1));
    return [...bucket.entries()].map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count);
  }, [vehicles]);

  const routeMix = useMemo(() => {
    const bucket = new Map<string, { trips: number; revenue: number }>();
    trips.forEach((row) => {
      const key = `${row.from} -> ${row.to}`;
      const current = bucket.get(key) || { trips: 0, revenue: 0 };
      current.trips += 1;
      current.revenue += row.fare - row.expenses;
      bucket.set(key, current);
    });
    return [...bucket.entries()].map(([route, values]) => ({ route, ...values })).sort((a, b) => b.revenue - a.revenue).slice(0, 6);
  }, [trips]);

  const fuelByVehicle = useMemo(() => {
    const bucket = new Map<string, number>();
    fuelLogs.forEach((row) => bucket.set(row.vehicle, (bucket.get(row.vehicle) || 0) + row.totalCost));
    return [...bucket.entries()].map(([vehicle, amount]) => ({ vehicle, amount })).sort((a, b) => b.amount - a.amount).slice(0, 6);
  }, [fuelLogs]);

  return (
    <div style={{ minHeight: "100vh", padding: "28px 32px", color: "#fff", fontFamily: transportFont }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: "0 0 6px", fontSize: 26, fontWeight: 800 }}>Transport Analytics</h1>
        <p style={{ margin: 0, fontSize: 13, color: transportMuted }}>Fleet composition, route yield, and fuel distribution.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Trips Logged", value: trips.length, color: "#60a5fa" },
          { label: "Completed Trips", value: trips.filter((row) => row.status === "completed").length, color: "#22c55e" },
          { label: "Fuel Spend", value: `Rs. ${fuelLogs.reduce((sum, row) => sum + row.totalCost, 0).toLocaleString()}`, color: "#f87171" },
          { label: "Fleet Capacity Units", value: vehicles.length, color: "#f59e0b" },
        ].map((card) => (
          <div key={card.label} style={{ background: transportBg, border: `1px solid ${transportBorder}`, borderRadius: 14, padding: "18px 20px" }}>
            <div style={{ fontSize: 12, color: transportMuted, marginBottom: 8 }}>{card.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 18 }}>
        <section style={{ background: transportBg, border: `1px solid ${transportBorder}`, borderRadius: 16, overflow: "hidden" }}>
          <div style={{ padding: "16px 18px", borderBottom: `1px solid ${transportBorder}`, fontSize: 15, fontWeight: 800 }}>Fleet Type Mix</div>
          <div style={{ padding: 18, display: "grid", gap: 10 }}>
            {typeMix.map((row) => (
              <div key={row.type} style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.05)" }}>
                <span style={{ fontSize: 13, textTransform: "capitalize" }}>{row.type}</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: "#93c5fd" }}>{row.count}</span>
              </div>
            ))}
          </div>
        </section>

        <section style={{ background: transportBg, border: `1px solid ${transportBorder}`, borderRadius: 16, overflow: "hidden" }}>
          <div style={{ padding: "16px 18px", borderBottom: `1px solid ${transportBorder}`, fontSize: 15, fontWeight: 800 }}>Top Routes</div>
          <div style={{ padding: 18, display: "grid", gap: 10 }}>
            {routeMix.map((row) => (
              <div key={row.route} style={{ display: "grid", gap: 4, padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.05)" }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{row.route}</div>
                <div style={{ fontSize: 12, color: transportMuted }}>{row.trips} trips | Net Rs. {row.revenue.toLocaleString()}</div>
              </div>
            ))}
            {routeMix.length === 0 && <div style={{ color: "rgba(255,255,255,.28)" }}>No trip data available.</div>}
          </div>
        </section>

        <section style={{ background: transportBg, border: `1px solid ${transportBorder}`, borderRadius: 16, overflow: "hidden" }}>
          <div style={{ padding: "16px 18px", borderBottom: `1px solid ${transportBorder}`, fontSize: 15, fontWeight: 800 }}>Fuel by Vehicle</div>
          <div style={{ padding: 18, display: "grid", gap: 10 }}>
            {fuelByVehicle.map((row) => (
              <div key={row.vehicle} style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.05)" }}>
                <span style={{ fontSize: 13 }}>{row.vehicle}</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: "#f87171" }}>Rs. {row.amount.toLocaleString()}</span>
              </div>
            ))}
            {fuelByVehicle.length === 0 && <div style={{ color: "rgba(255,255,255,.28)" }}>No fuel data available.</div>}
          </div>
        </section>
      </div>
    </div>
  );
}
