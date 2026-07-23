"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchJson, travelAccent, type TravelControlCenter } from "./_shared";
import { useResponsive } from "@/hooks/useResponsive";

const emptyState: TravelControlCenter = {
  summary: { tickets: 0, issuedTickets: 0, pendingTickets: 0, visaCases: 0, activeVisaCases: 0, hotels: 0, confirmedHotels: 0, tours: 0, confirmedTours: 0, settlements: 0, pendingSettlements: 0, monthlySales: 0, supplierExposure: 0, passports: 0 },
  tickets: [],
  visas: [],
  hotels: [],
  tours: [],
  settlements: [],
};

const NAV_ITEMS = [
  { label: "✈️ Airline Tickets", href: "/dashboard/travel/tickets", color: travelAccent },
  { label: "🛂 Visa Cases", href: "/dashboard/travel/visas", color: "#a78bfa" },
  { label: "🏨 Hotel Packages", href: "/dashboard/travel/hotel-packages", color: "#a78bfa" },
  { label: "🚌 Group Tours", href: "/dashboard/travel/tours", color: "#f97316" },
  { label: "🧾 Settlements", href: "/dashboard/travel/settlements", color: "#f87171" },
  { label: "🛂 Passports", href: "/dashboard/travel/passports", color: "#34d399" },
  { label: "📊 Analytics", href: "/dashboard/travel/analytics", color: "#60a5fa" },
  { label: "📋 Quotation", href: "/dashboard/quotation", color: "rgba(255,255,255,.4)" },
  { label: "🧾 Sales Invoice", href: "/dashboard/sales-invoice", color: "rgba(255,255,255,.4)" },
];

export default function TravelOverviewPage() {
  const { isMobile } = useResponsive();
  const [data, setData] = useState(emptyState);

  useEffect(() => {
    fetchJson("/api/travel/control-center", emptyState).then(setData);
  }, []);

  const { summary, tickets, visas, hotels, tours } = data;

  return (
    <div style={{ padding: isMobile ? "15px 14px" : "28px 32px", color: "#e2e8f0", fontFamily: "'Outfit','Inter',sans-serif" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20, flexWrap: "wrap", marginBottom: 28 }}>
        <div>
          <h1 style={{ margin: "0 0 6px", fontSize: 26, fontWeight: 800, color: "white" }}>✈️ Travel Agency Command Center</h1>
          <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,.45)" }}>
            Manage airline ticketing, visa processing, hotel bookings, group tours, and supplier settlements.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {NAV_ITEMS.map(item => (
            <Link key={item.href} prefetch={false} href={item.href} style={{ padding: "9px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.03)", color: item.color, textDecoration: "none", fontSize: 12, fontWeight: 700 }}>
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      {/* KPI Grid */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit,minmax(140px,1fr))", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Tickets", value: summary.tickets, color: travelAccent },
          { label: "Issued", value: summary.issuedTickets, color: "#34d399" },
          { label: "Pending Tickets", value: summary.pendingTickets, color: "#fbbf24" },
          { label: "Visa Cases", value: summary.visaCases, color: "#a78bfa" },
          { label: "Active Visas", value: summary.activeVisaCases, color: "#f97316" },
          { label: "Hotel Bookings", value: summary.hotels, color: "#a78bfa" },
          { label: "Confirmed Hotels", value: summary.confirmedHotels, color: "#34d399" },
          { label: "Group Tours", value: summary.tours, color: "#f97316" },
          { label: "Confirmed Tours", value: summary.confirmedTours, color: "#34d399" },
          { label: "Settlements", value: summary.settlements, color: "#38bdf8" },
          { label: "Pending Payables", value: summary.pendingSettlements, color: "#fb7185" },
          { label: "Passports", value: summary.passports, color: "#34d399" },
          { label: "Total Sales", value: `Rs. ${summary.monthlySales.toLocaleString()}`, color: "#60a5fa" },
          { label: "Supplier Exposure", value: `Rs. ${summary.supplierExposure.toLocaleString()}`, color: "#c084fc" },
        ].map(card => (
          <div key={card.label} style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 14, padding: isMobile ? "12px 10px" : "16px 18px" }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,.4)", marginBottom: 6, textTransform: "uppercase", letterSpacing: ".06em" }}>{card.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      {/* Four-column desk */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit,minmax(280px,1fr))", gap: 16 }}>

        {/* Ticketing Desk */}
        <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>✈️ Ticketing Desk</div>
            <Link prefetch={false} href="/dashboard/travel/tickets" style={{ fontSize: 11, color: travelAccent, textDecoration: "none", fontWeight: 700 }}>View all →</Link>
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            {tickets.slice(0, 5).map(item => (
              <div key={item.id} style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.05)" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{item.booking}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,.45)", marginTop: 3 }}>{item.passenger || "-"} | {item.airline || "-"}</div>
                <div style={{ fontSize: 11, color: travelAccent, marginTop: 4 }}>{item.route || "-"} | <span style={{ color: "rgba(255,255,255,.5)" }}>{item.status}</span></div>
              </div>
            ))}
            {tickets.length === 0 && <div style={{ fontSize: 13, color: "rgba(255,255,255,.35)", padding: "12px 0" }}>No tickets yet.</div>}
          </div>
        </div>

        {/* Visa Desk */}
        <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>🛂 Visa Processing</div>
            <Link prefetch={false} href="/dashboard/travel/visas" style={{ fontSize: 11, color: "#a78bfa", textDecoration: "none", fontWeight: 700 }}>View all →</Link>
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            {visas.slice(0, 5).map(item => (
              <div key={item.id} style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.05)" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{item.caseRef}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,.45)", marginTop: 3 }}>{item.applicant || "-"} | {item.country || "-"}</div>
                <div style={{ fontSize: 11, color: "#a78bfa", marginTop: 4 }}>{item.submissionDate || "-"} | <span style={{ color: "rgba(255,255,255,.5)" }}>{item.status}</span></div>
              </div>
            ))}
            {visas.length === 0 && <div style={{ fontSize: 13, color: "rgba(255,255,255,.35)", padding: "12px 0" }}>No visa cases yet.</div>}
          </div>
        </div>

        {/* Hotel Bookings */}
        <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>🏨 Hotel Bookings</div>
            <Link prefetch={false} href="/dashboard/travel/hotel-packages" style={{ fontSize: 11, color: "#a78bfa", textDecoration: "none", fontWeight: 700 }}>View all →</Link>
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            {hotels.slice(0, 5).map(item => (
              <div key={item.id} style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.05)" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{item.bookingRef}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,.45)", marginTop: 3 }}>{item.guestName || "-"} | {item.hotelName || "-"}</div>
                <div style={{ fontSize: 11, color: "#a78bfa", marginTop: 4 }}>{item.destination || "-"} | <span style={{ color: "rgba(255,255,255,.5)" }}>{item.status}</span></div>
              </div>
            ))}
            {hotels.length === 0 && <div style={{ fontSize: 13, color: "rgba(255,255,255,.35)", padding: "12px 0" }}>No hotel bookings yet.</div>}
          </div>
        </div>

        {/* Group Tours */}
        <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>🚌 Group Tours</div>
            <Link prefetch={false} href="/dashboard/travel/tours" style={{ fontSize: 11, color: "#f97316", textDecoration: "none", fontWeight: 700 }}>View all →</Link>
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            {tours.slice(0, 5).map(item => (
              <div key={item.id} style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.05)" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{item.tourRef}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,.45)", marginTop: 3 }}>{item.tourName || "-"} | {item.destination || "-"}</div>
                <div style={{ fontSize: 11, color: "#f97316", marginTop: 4 }}>Pax: {item.pax} | <span style={{ color: "rgba(255,255,255,.5)" }}>{item.status}</span></div>
              </div>
            ))}
            {tours.length === 0 && <div style={{ fontSize: 13, color: "rgba(255,255,255,.35)", padding: "12px 0" }}>No group tours yet.</div>}
          </div>
        </div>

      </div>
    </div>
  );
}
