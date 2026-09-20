"use client";

/**
 * New booking — one door.
 *
 * A walk-in asking for an Umrah ticket could be started on the Airline Tickets
 * form, the four-step Book Flight wizard, or as a Trip, and all three worked.
 * Three doors for one job is not choice, it is a decision the agent has to make
 * before they can start — so the desk that took the call picked a different one
 * each time and the same kind of sale ended up recorded three different ways.
 *
 * This asks the only question that actually decides it: what does the customer
 * want? Everything after that is the same screens as before.
 */

import { useRouter } from "next/navigation";

import { useResponsive } from "@/hooks/useResponsive";
import { T, ff, flightCss } from "../_flight/ui";

type Door = {
  icon: string;
  title: string;
  when: string;
  detail: string;
  href: string;
  tone: string;
};

/* Ordered by how often a desk actually uses them, not by how the modules are
   arranged. A ticket on its own is most of the day's work. */
const DOORS: Door[] = [
  {
    icon: "✈️",
    title: "Just a ticket",
    when: "One flight, nothing else",
    detail: "Passenger, PNR, supplier and fare. Invoices and settles against the airline on its own.",
    href: "/dashboard/travel/tickets",
    tone: "#38bdf8",
  },
  {
    icon: "🧳",
    title: "A whole trip",
    when: "Ticket with a visa, hotel or transfer",
    detail: "One file for the journey — one customer, one quotation, one invoice, one margin. Services already raised on their own desks can be attached to it.",
    href: "/dashboard/travel/trips",
    tone: "#34d399",
  },
  {
    icon: "🕋",
    title: "Umrah or Hajj group",
    when: "A party joining a departure",
    detail: "Priced off the departure's rate card by sharing, paid in instalments over months, and travelling with the group.",
    href: "/dashboard/travel/bookings",
    tone: "#a78bfa",
  },
  {
    icon: "🛂",
    title: "Just a visa",
    when: "No ticket involved",
    detail: "Application, documents, embassy fee and your service charge.",
    href: "/dashboard/travel/visas",
    tone: "#f4c25b",
  },
  {
    icon: "📕",
    title: "Passport service",
    when: "New, renewal or correction",
    detail: "The application and its documents, tracked to delivery.",
    href: "/dashboard/travel/passports",
    tone: "#f4c25b",
  },
  {
    icon: "🏨",
    title: "Hotel only",
    when: "Rooms without a flight",
    detail: "Guest, hotel, nights, meal plan and the supplier the payable lands on.",
    href: "/dashboard/travel/hotel-packages",
    tone: "#60a5fa",
  },
  {
    icon: "🚐",
    title: "Transport only",
    when: "A transfer, cab or coach",
    detail: "Pickup, drop-off, vehicle and the driver against it.",
    href: "/dashboard/travel/transport",
    tone: "#60a5fa",
  },
  {
    icon: "🛡",
    title: "Insurance only",
    when: "Cover for a visa or a trip",
    detail: "The plan, the cover window and the insurer.",
    href: "/dashboard/travel/insurance",
    tone: "#60a5fa",
  },
];

/* The two screens that make everything above quicker, and are filled in once
   rather than per booking. */
const SETUP = [
  { icon: "💱", title: "Contract Fares", detail: "Your negotiated net and selling fares. Quote a sector in seconds without asking anybody.", href: "/dashboard/travel/fare-sheet" },
  { icon: "👤", title: "Travellers", detail: "The people who fly, kept once. Their passports, and a warning six months before one expires.", href: "/dashboard/travel/travelers" },
];

export default function NewBookingPage() {
  const router = useRouter();
  const { isMobile } = useResponsive();

  return (
    <div style={{ padding: isMobile ? 16 : "24px 28px", fontFamily: ff, color: T.text, maxWidth: 1100, margin: "0 auto" }}>
      <style dangerouslySetInnerHTML={{ __html: flightCss }} />

      <header style={{ marginBottom: 22 }}>
        <h1 style={{ margin: 0, fontSize: isMobile ? 22 : 27, fontWeight: 800, color: T.text }}>
          What does the customer want?
        </h1>
        <p style={{ margin: "6px 0 0", fontSize: 14, color: T.muted, lineHeight: 1.6 }}>
          Pick one and it opens the right desk. Everything after that is the same as it always was.
        </p>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fit,minmax(${isMobile ? 260 : 300}px,1fr))`, gap: 14 }}>
        {DOORS.map((door) => (
          <button
            key={door.href}
            type="button"
            className="fl-card"
            onClick={() => router.push(door.href)}
            style={{
              textAlign: "left", border: `1px solid ${T.border}`, borderRadius: 15,
              background: T.card, padding: 17, cursor: "pointer", fontFamily: "inherit",
              display: "grid", gap: 8, minWidth: 0,
            }}
          >
            <div style={{ display: "flex", gap: 11, alignItems: "center" }}>
              <span
                style={{
                  width: 38, height: 38, borderRadius: 11, flexShrink: 0, display: "grid",
                  placeItems: "center", fontSize: 18,
                  background: `${door.tone}1f`, border: `1px solid ${door.tone}44`,
                }}
              >
                {door.icon}
              </span>
              <span style={{ minWidth: 0 }}>
                <span style={{ display: "block", fontSize: 15.5, fontWeight: 800, color: T.text }}>{door.title}</span>
                <span style={{ display: "block", fontSize: 11.5, color: door.tone, fontWeight: 600, marginTop: 1 }}>{door.when}</span>
              </span>
            </div>
            <p style={{ margin: 0, fontSize: 12.5, color: T.muted, lineHeight: 1.6 }}>{door.detail}</p>
          </button>
        ))}
      </div>

      <div style={{ marginTop: 26 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: T.text, marginBottom: 4 }}>Filled in once, used every day</div>
        <p style={{ margin: "0 0 12px", fontSize: 12.5, color: T.muted }}>
          Neither is a booking. Both make every booking above faster.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fit,minmax(${isMobile ? 260 : 320}px,1fr))`, gap: 12 }}>
          {SETUP.map((row) => (
            <a
              key={row.href}
              href={row.href}
              className="fl-card"
              style={{
                border: `1px dashed ${T.border}`, borderRadius: 13, background: "var(--panel-bg)",
                padding: 14, textDecoration: "none", display: "grid", gap: 5, minWidth: 0,
              }}
            >
              <span style={{ fontSize: 13.5, fontWeight: 700, color: T.text }}>{row.icon} {row.title}</span>
              <span style={{ fontSize: 12, color: T.muted, lineHeight: 1.55 }}>{row.detail}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
