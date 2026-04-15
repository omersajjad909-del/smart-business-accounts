"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { RealEstateControlCenter, fetchJson, realEstateBg, realEstateBorder, realEstateFont, realEstateMuted } from "./_shared";

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

export default function RealEstateOverviewPage() {
  const [data, setData] = useState(emptyState);

  useEffect(() => {
    fetchJson("/api/real-estate/control-center", emptyState).then(setData);
  }, []);

  const { summary, leases } = data;
  const expiringLeases = leases.filter((row) => row.status === "active").slice(0, 5);

  return (
    <div style={{ minHeight: "100vh", padding: "28px 32px", color: "#fff", fontFamily: realEstateFont }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 26, gap: 20, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: "0 0 6px", fontSize: 26, fontWeight: 800 }}>Real Estate Command Center</h1>
          <p style={{ margin: 0, fontSize: 13, color: realEstateMuted }}>Portfolio occupancy, active leases, tenants, and collections in one view.</p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {[
            { label: "Properties", href: "/dashboard/real-estate/properties" },
            { label: "Tenants", href: "/dashboard/real-estate/tenants" },
            { label: "Leases", href: "/dashboard/real-estate/leases" },
            { label: "Rent", href: "/dashboard/real-estate/rent" },
            { label: "Analytics", href: "/dashboard/real-estate/analytics" },
          ].map((action) => (
            <Link prefetch={false} key={action.href} href={action.href} style={{ padding: "10px 14px", borderRadius: 10, border: `1px solid ${realEstateBorder}`, background: realEstateBg, color: "#c7d2fe", textDecoration: "none", fontSize: 12, fontWeight: 700 }}>
              {action.label}
            </Link>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Properties", value: summary.properties, color: "#818cf8" },
          { label: "Occupancy", value: `${summary.occupancyRate}%`, color: "#34d399" },
          { label: "Collected Rent", value: `Rs. ${summary.collectedRent.toLocaleString()}`, color: "#60a5fa" },
          { label: "Pending Rent", value: `Rs. ${summary.pendingRent.toLocaleString()}`, color: "#f87171" },
        ].map((card) => (
          <div key={card.label} style={{ background: realEstateBg, border: `1px solid ${realEstateBorder}`, borderRadius: 14, padding: "18px 20px" }}>
            <div style={{ fontSize: 12, color: realEstateMuted, marginBottom: 8 }}>{card.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.1fr .9fr", gap: 18 }}>
        <div style={{ background: realEstateBg, border: `1px solid ${realEstateBorder}`, borderRadius: 16, overflow: "hidden" }}>
          <div style={{ padding: "16px 18px", borderBottom: `1px solid ${realEstateBorder}`, fontSize: 15, fontWeight: 800 }}>Portfolio Snapshot</div>
          <div style={{ padding: 18, display: "grid", gap: 10 }}>
            {[
              { label: "Vacant properties", value: summary.vacantProperties, color: "#34d399" },
              { label: "Rented properties", value: summary.rentedProperties, color: "#818cf8" },
              { label: "Maintenance units", value: summary.maintenanceProperties, color: "#f59e0b" },
              { label: "Active tenants", value: summary.activeTenants, color: "#c084fc" },
            ].map((row) => (
              <div key={row.label} style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.05)" }}>
                <span style={{ fontSize: 13, color: realEstateMuted }}>{row.label}</span>
                <span style={{ fontSize: 16, fontWeight: 800, color: row.color }}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: realEstateBg, border: `1px solid ${realEstateBorder}`, borderRadius: 16, overflow: "hidden" }}>
          <div style={{ padding: "16px 18px", borderBottom: `1px solid ${realEstateBorder}`, fontSize: 15, fontWeight: 800 }}>Lease Watchlist</div>
          <div style={{ padding: 18, display: "grid", gap: 10 }}>
            {expiringLeases.length === 0 && <div style={{ color: "rgba(255,255,255,.28)" }}>No active leases yet.</div>}
            {expiringLeases.map((lease) => (
              <div key={lease.id} style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.05)" }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{lease.tenant}</div>
                <div style={{ fontSize: 12, color: realEstateMuted, marginTop: 4 }}>{lease.property} | {lease.startDate} to {lease.endDate}</div>
                <div style={{ fontSize: 12, color: "#93c5fd", marginTop: 6 }}>Rs. {lease.rentAmount.toLocaleString()} / month</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
