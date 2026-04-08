"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { eventsAccent, fetchJson, type EventsControlCenter } from "./_shared";

const emptyState: EventsControlCenter = {
  summary: { bookings: 0, confirmedBookings: 0, tentativeBookings: 0, vendors: 0, activeVendors: 0, budgetLines: 0, plannedSpend: 0, pipelineValue: 0 },
  bookings: [],
  vendors: [],
  budgets: [],
};

export default function EventsOverviewPage() {
  const [data, setData] = useState(emptyState);

  useEffect(() => {
    fetchJson("/api/events/control-center", emptyState).then(setData);
  }, []);

  const { summary, bookings, vendors, budgets } = data;

  return (
    <div style={{ padding: "28px 32px", color: "#e2e8f0", fontFamily: "'Outfit','Inter',sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20, flexWrap: "wrap", marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: "0 0 6px", fontSize: 26, fontWeight: 800, color: "white" }}>Events Command Center</h1>
          <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,.45)" }}>Bookings, vendor coverage, and event budget control from live operations records.</p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {[
            { label: "Bookings", href: "/dashboard/events/bookings" },
            { label: "Vendors", href: "/dashboard/events/vendors" },
            { label: "Event Budget", href: "/dashboard/events/budget" },
            { label: "Analytics", href: "/dashboard/events/analytics" },
          ].map((item) => (
            <Link key={item.href} href={item.href} style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.03)", color: "#fda4af", textDecoration: "none", fontSize: 12, fontWeight: 700 }}>
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,minmax(0,1fr))", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Bookings", value: summary.bookings, color: eventsAccent },
          { label: "Confirmed", value: summary.confirmedBookings, color: "#34d399" },
          { label: "Tentative", value: summary.tentativeBookings, color: "#fbbf24" },
          { label: "Vendors", value: summary.activeVendors, color: "#60a5fa" },
          { label: "Pipeline Value", value: summary.pipelineValue.toLocaleString(), color: "#f97316" },
        ].map((card) => (
          <div key={card.label} style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, padding: "18px 20px" }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,.45)", marginBottom: 8, textTransform: "uppercase", letterSpacing: ".06em" }}>{card.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.1fr .9fr", gap: 16 }}>
        <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, padding: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "white", marginBottom: 14 }}>Upcoming Bookings</div>
          <div style={{ display: "grid", gap: 10 }}>
            {bookings.slice(0, 6).map((item) => (
              <div key={item.id} style={{ padding: "12px 14px", borderRadius: 12, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.05)" }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{item.booking}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,.45)", marginTop: 4 }}>{item.client || "-"} | {item.package || "-"}</div>
                <div style={{ fontSize: 12, color: "#fda4af", marginTop: 6 }}>{item.eventDate || "-"} | {item.status}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, padding: 20 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "white", marginBottom: 12 }}>Vendor Coverage</div>
            <div style={{ display: "grid", gap: 10 }}>
              {vendors.slice(0, 5).map((item) => (
                <div key={item.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "10px 12px", borderRadius: 12, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.05)" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{item.vendor}</div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,.45)" }}>{item.service || "-"}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{item.city || "-"}</div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,.45)" }}>{item.status}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, padding: 20 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "white", marginBottom: 12 }}>Budget Desk</div>
            <div style={{ display: "grid", gap: 10 }}>
              {budgets.slice(0, 5).map((item) => (
                <div key={item.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "10px 12px", borderRadius: 12, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.05)" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{item.event}</div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,.45)" }}>{item.category || "-"}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{item.amount.toLocaleString()}</div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,.45)" }}>{item.status}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
