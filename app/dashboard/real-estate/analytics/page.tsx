"use client";

import { useEffect, useState } from "react";
import { RealEstateControlCenter, fetchJson, realEstateBg, realEstateBorder, realEstateFont, realEstateMuted } from "../_shared";

const emptyState: RealEstateControlCenter = {
  summary: {
    properties: 0,
    rentedProperties: 0,
    vacantProperties: 0,
    maintenanceProperties: 0,
    tenants: 0,
    activeTenants: 0,
    leases: 0,
    activeLeases: 0,
    occupancyRate: 0,
    collectedRent: 0,
    pendingRent: 0,
  },
  properties: [],
  tenants: [],
  leases: [],
  rents: [],
};

export default function RealEstateAnalyticsPage() {
  const [data, setData] = useState(emptyState);

  useEffect(() => {
    fetchJson("/api/real-estate/control-center", emptyState).then(setData);
  }, []);

  const propertyMix = data.properties.reduce<Record<string, number>>((acc, row) => {
    acc[row.type] = (acc[row.type] || 0) + 1;
    return acc;
  }, {});

  const rentByProperty = data.rents.reduce<Record<string, number>>((acc, row) => {
    const key = row.property || "Unknown";
    acc[key] = (acc[key] || 0) + row.amount;
    return acc;
  }, {});

  return (
    <div style={{ minHeight: "100vh", padding: "28px 32px", color: "#fff", fontFamily: realEstateFont }}>
      <div style={{ marginBottom: 26 }}>
        <h1 style={{ margin: "0 0 6px", fontSize: 24, fontWeight: 800 }}>Real Estate Analytics</h1>
        <p style={{ margin: 0, fontSize: 13, color: realEstateMuted }}>Occupancy, portfolio mix, and rent performance overview.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 18 }}>
        <div style={{ background: realEstateBg, border: `1px solid ${realEstateBorder}`, borderRadius: 16, padding: 18 }}>
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 14 }}>Occupancy and Lease Health</div>
          <div style={{ display: "grid", gap: 10 }}>
            {[
              { label: "Active leases", value: data.summary.activeLeases, color: "#818cf8" },
              { label: "Expired leases", value: data.leases.filter((row) => row.status !== "active").length, color: "#f87171" },
              { label: "Active tenants", value: data.summary.activeTenants, color: "#34d399" },
              { label: "Pending rent records", value: data.rents.filter((row) => row.status !== "paid").length, color: "#f59e0b" },
            ].map((row) => (
              <div key={row.label} style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.05)" }}>
                <span style={{ fontSize: 13, color: realEstateMuted }}>{row.label}</span>
                <span style={{ fontSize: 15, fontWeight: 800, color: row.color }}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: realEstateBg, border: `1px solid ${realEstateBorder}`, borderRadius: 16, padding: 18 }}>
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 14 }}>Property Mix</div>
          <div style={{ display: "grid", gap: 10 }}>
            {Object.entries(propertyMix).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
              <div key={type} style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.05)" }}>
                <span style={{ fontSize: 13 }}>{type}</span>
                <span style={{ fontSize: 15, fontWeight: 800, color: "#93c5fd" }}>{count}</span>
              </div>
            ))}
            {Object.keys(propertyMix).length === 0 && <div style={{ color: "rgba(255,255,255,.28)" }}>No property mix available.</div>}
          </div>
        </div>
      </div>

      <div style={{ background: realEstateBg, border: `1px solid ${realEstateBorder}`, borderRadius: 16, padding: 18 }}>
        <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 14 }}>Rent by Property</div>
        <div style={{ display: "grid", gap: 10 }}>
          {Object.entries(rentByProperty).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([property, amount]) => (
            <div key={property} style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.05)" }}>
              <span style={{ fontSize: 13 }}>{property}</span>
              <span style={{ fontSize: 15, fontWeight: 800, color: "#34d399" }}>Rs. {amount.toLocaleString()}</span>
            </div>
          ))}
          {Object.keys(rentByProperty).length === 0 && <div style={{ color: "rgba(255,255,255,.28)" }}>No rent data yet.</div>}
        </div>
      </div>
    </div>
  );
}
