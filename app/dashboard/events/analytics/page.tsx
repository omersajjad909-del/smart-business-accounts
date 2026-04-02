"use client";

import { BusinessVerticalShell } from "../../_components/BusinessVerticalShell";

export default function EventsAnalyticsPage() {
  return (
    <BusinessVerticalShell
      title="Events Analytics"
      subtitle="Booking pipeline, vendor dependency, budget pressure, and execution-readiness signals."
      mode="analytics"
      accent="#fb7185"
      links={[
        { label: "Overview", href: "/dashboard/events" },
        { label: "Bookings", href: "/dashboard/events/bookings" },
        { label: "Vendors", href: "/dashboard/events/vendors" },
        { label: "Event Budget", href: "/dashboard/events/budget" },
      ]}
      highlights={[
        { title: "Booking Pipeline", description: "See which upcoming events are commercially secure and execution-ready." },
        { title: "Vendor Exposure", description: "Surface dependence on a few critical suppliers or service categories." },
        { title: "Budget Pressure", description: "Highlight events likely to drift away from planned margin." },
        { title: "Delivery Readiness", description: "Check whether upcoming events have enough vendor and budget coverage." },
      ]}
      workflow={[
        "Upcoming events are reviewed against vendor commitments and commercial coverage.",
        "High-risk budgets are flagged before event dates get too close.",
        "Operational bottlenecks are surfaced while there is still room to correct them.",
        "Management uses this view to protect service quality and event margin.",
      ]}
    />
  );
}
