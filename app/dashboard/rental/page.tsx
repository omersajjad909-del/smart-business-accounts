"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { rentalAccent } from "./_shared";

type RentalControlCenter = {
  summary: {
    bookings: number;
    activeBookings: number;
    agreements: number;
    activeAgreements: number;
    bookingValue: number;
  };
  bookings: Array<{ id: string; booking: string; customer: string; asset: string; pickupDate: string; status: string }>;
  agreements: Array<{ id: string; agreement: string; customer: string; asset: string; startDate: string; status: string }>;
};

const emptyState: RentalControlCenter = {
  summary: { bookings: 0, activeBookings: 0, agreements: 0, activeAgreements: 0, bookingValue: 0 },
  bookings: [],
  agreements: [],
};

export default function RentalOverviewPage() {
  const [data, setData] = useState(emptyState);

  useEffect(() => {
    fetch("/api/rentals/control-center", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!json) return setData(emptyState);
        setData({
          summary: {
            bookings: json.summary.bookings,
            activeBookings: json.summary.activeBookings,
            agreements: json.summary.agreements,
            activeAgreements: json.summary.activeAgreements,
            bookingValue: json.summary.bookingValue,
          },
          bookings: json.bookings,
          agreements: json.agreements,
        });
      })
      .catch(() => setData(emptyState));
  }, []);

  return (
    <div style={{ padding: "28px 32px", color: "#e2e8f0", fontFamily: "'Outfit','Inter',sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20, flexWrap: "wrap", marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: "0 0 6px", fontSize: 26, fontWeight: 800, color: "white" }}>Rental Command Center</h1>
          <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,.45)" }}>Bookings and agreements for vehicle or equipment rentals.</p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link prefetch={false} href="/dashboard/rental/bookings" style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.03)", color: "#86efac", textDecoration: "none", fontSize: 12, fontWeight: 700 }}>Bookings</Link>
          <Link prefetch={false} href="/dashboard/rental/agreements" style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.03)", color: "#86efac", textDecoration: "none", fontSize: 12, fontWeight: 700 }}>Agreements</Link>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,minmax(0,1fr))", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Bookings", value: data.summary.bookings, color: rentalAccent },
          { label: "Active Bookings", value: data.summary.activeBookings, color: "#60a5fa" },
          { label: "Agreements", value: data.summary.agreements, color: "#34d399" },
          { label: "Active Agreements", value: data.summary.activeAgreements, color: "#fbbf24" },
          { label: "Booking Value", value: data.summary.bookingValue.toLocaleString(), color: "#f97316" },
        ].map((card) => (
          <div key={card.label} style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, padding: "18px 20px" }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,.45)", marginBottom: 8, textTransform: "uppercase", letterSpacing: ".06em" }}>{card.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <section style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, padding: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "white", marginBottom: 14 }}>Booking Snapshot</div>
          <div style={{ display: "grid", gap: 10 }}>
            {data.bookings.slice(0, 6).map((item) => (
              <div key={item.id} style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.05)" }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{item.booking}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,.45)" }}>{item.customer} | {item.asset}</div>
              </div>
            ))}
          </div>
        </section>
        <section style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, padding: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "white", marginBottom: 14 }}>Agreement Snapshot</div>
          <div style={{ display: "grid", gap: 10 }}>
            {data.agreements.slice(0, 6).map((item) => (
              <div key={item.id} style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.05)" }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{item.agreement}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,.45)" }}>{item.customer} | {item.asset}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
