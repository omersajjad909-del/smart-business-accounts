"use client";

import { BusinessVerticalShell } from "../_components/BusinessVerticalShell";

export default function EventsOverviewPage() {
  return (
    <BusinessVerticalShell
      title="Events Overview"
      subtitle="Bookings, vendors, budgeting, and execution control for event-led businesses."
      mode="overview"
      accent="#fb7185"
      links={[
        { label: "Bookings", href: "/dashboard/events/bookings" },
        { label: "Vendors", href: "/dashboard/events/vendors" },
        { label: "Event Budget", href: "/dashboard/events/budget" },
        { label: "Analytics", href: "/dashboard/events/analytics" },
      ]}
      highlights={[
        { title: "Booking Desk", description: "Track event commitments, packages, dates, and client expectations." },
        { title: "Vendor Network", description: "Manage outsourced vendors and execution dependencies cleanly." },
        { title: "Budget Control", description: "Keep event spend, margin pressure, and delivery promises aligned." },
        { title: "Execution Flow", description: "Turn client booking into planned, budgeted, and coordinated execution." },
      ]}
      workflow={[
        "Client booking is captured with date, package, and commercial details.",
        "Vendor support and event budget are tied back to the active booking.",
        "Execution is coordinated through supplier readiness and internal planning.",
        "Post-event review informs vendor quality, pricing, and next upsell opportunity.",
      ]}
    />
  );
}
