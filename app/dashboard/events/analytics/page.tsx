"use client";

import { useEffect, useState } from "react";
import { eventsAccent, fetchJson, type EventsControlCenter } from "../_shared";

const emptyState: EventsControlCenter = {
  summary: { bookings: 0, confirmedBookings: 0, tentativeBookings: 0, vendors: 0, activeVendors: 0, budgetLines: 0, plannedSpend: 0, pipelineValue: 0 },
  bookings: [],
  vendors: [],
  budgets: [],
};

export default function EventsAnalyticsPage() {
  const [data, setData] = useState(emptyState);

  useEffect(() => {
    fetchJson("/api/events/control-center", emptyState).then(setData);
  }, []);

  return (
    <div style={{ padding: "28px 32px", color: "#e2e8f0", fontFamily: "'Outfit','Inter',sans-serif" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: "0 0 6px", fontSize: 24, fontWeight: 800, color: "white" }}>Events Analytics</h1>
        <p style={{ margin: 0, fontSize: 14, color: "rgba(255,255,255,.45)" }}>Booking pipeline, vendor dependency, budget pressure, and execution readiness.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 14, marginBottom: 24 }}>
        {[
          { label: "Bookings", value: data.summary.bookings, color: eventsAccent },
          { label: "Confirmed", value: data.summary.confirmedBookings, color: "#34d399" },
          { label: "Vendors", value: data.summary.activeVendors, color: "#60a5fa" },
          { label: "Planned Spend", value: data.summary.plannedSpend.toLocaleString(), color: "#fbbf24" },
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
                <span style={{ fontSize: 14, fontWeight: 800, color: "#fda4af" }}>{item.amount.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </section>

        <section style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, padding: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "white", marginBottom: 14 }}>Vendor Snapshot</div>
          <div style={{ display: "grid", gap: 10 }}>
            {data.vendors.slice(0, 8).map((item) => (
              <div key={item.id} style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.05)" }}>
                <span style={{ fontSize: 13 }}>{item.vendor}</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: "#60a5fa" }}>{item.status}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
