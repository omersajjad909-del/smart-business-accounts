"use client";

import { BusinessVerticalShell } from "../../_components/BusinessVerticalShell";

export default function RentalsAnalyticsPage() {
  return (
    <BusinessVerticalShell
      title="Rentals Analytics"
      subtitle="Asset utilization, booking pressure, agreement discipline, and maintenance impact."
      mode="analytics"
      accent="#60a5fa"
      links={[
        { label: "Overview", href: "/dashboard/rentals" },
        { label: "Rental Items", href: "/dashboard/rentals/items" },
        { label: "Bookings", href: "/dashboard/rentals/bookings" },
        { label: "Agreements", href: "/dashboard/rentals/agreements" },
        { label: "Maintenance", href: "/dashboard/rentals/maintenance" },
      ]}
      highlights={[
        { title: "Utilization View", description: "Understand which asset lines are underused, overbooked, or margin-rich." },
        { title: "Booking Pressure", description: "Track future demand against available rental capacity." },
        { title: "Agreement Control", description: "Spot bookings that still need tighter commercial documentation." },
        { title: "Downtime Risk", description: "See how maintenance delays affect rental readiness and asset turnover." },
      ]}
      workflow={[
        "Capacity planning starts with rental-item readiness and booking demand.",
        "Commercial discipline is checked through booking-to-agreement completion.",
        "Maintenance-linked downtime is measured against expected utilization.",
        "Leadership uses this reading to maximize rental yield and availability.",
      ]}
    />
  );
}
