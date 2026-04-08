"use client";

import { useEffect, useState } from "react";
import { fetchJson, rentalsAccent, type RentalsControlCenter } from "../_shared";

const emptyState: RentalsControlCenter = {
  summary: { items: 0, availableItems: 0, bookings: 0, activeBookings: 0, agreements: 0, activeAgreements: 0, maintenanceJobs: 0, dueMaintenance: 0, bookingValue: 0 },
  items: [],
  bookings: [],
  agreements: [],
  maintenance: [],
};

export default function RentalsAnalyticsPage() {
  const [data, setData] = useState(emptyState);

  useEffect(() => {
    fetchJson("/api/rentals/control-center", emptyState).then(setData);
  }, []);

  return (
    <div style={{ padding: "28px 32px", color: "#e2e8f0", fontFamily: "'Outfit','Inter',sans-serif" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: "0 0 6px", fontSize: 24, fontWeight: 800, color: "white" }}>Rentals Analytics</h1>
        <p style={{ margin: 0, fontSize: 14, color: "rgba(255,255,255,.45)" }}>Asset utilization, booking pressure, agreement discipline, and maintenance impact.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 14, marginBottom: 24 }}>
        {[
          { label: "Items", value: data.summary.items, color: rentalsAccent },
          { label: "Active Bookings", value: data.summary.activeBookings, color: "#fbbf24" },
          { label: "Active Agreements", value: data.summary.activeAgreements, color: "#60a5fa" },
          { label: "Due Maintenance", value: data.summary.dueMaintenance, color: "#f97316" },
        ].map((card) => (
          <div key={card.label} style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, padding: "18px 20px" }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,.45)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6 }}>{card.label}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <section style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, padding: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "white", marginBottom: 14 }}>Booking Snapshot</div>
          <div style={{ display: "grid", gap: 10 }}>
            {data.bookings.slice(0, 8).map((item) => (
              <div key={item.id} style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.05)" }}>
                <span style={{ fontSize: 13 }}>{item.booking}</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: "#93c5fd" }}>{item.status}</span>
              </div>
            ))}
          </div>
        </section>

        <section style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, padding: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "white", marginBottom: 14 }}>Maintenance Snapshot</div>
          <div style={{ display: "grid", gap: 10 }}>
            {data.maintenance.slice(0, 8).map((item) => (
              <div key={item.id} style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.05)" }}>
                <span style={{ fontSize: 13 }}>{item.job}</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: "#f97316" }}>{item.status}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
