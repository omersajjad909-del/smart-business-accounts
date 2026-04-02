"use client";

import { BusinessVerticalShell } from "../_components/BusinessVerticalShell";

export default function RentalsOverviewPage() {
  return (
    <BusinessVerticalShell
      title="Rentals Overview"
      subtitle="Rental items, bookings, agreements, and maintenance readiness for rental operations."
      mode="overview"
      accent="#60a5fa"
      links={[
        { label: "Rental Items", href: "/dashboard/rentals/items" },
        { label: "Bookings", href: "/dashboard/rentals/bookings" },
        { label: "Agreements", href: "/dashboard/rentals/agreements" },
        { label: "Maintenance", href: "/dashboard/rentals/maintenance" },
        { label: "Analytics", href: "/dashboard/rentals/analytics" },
      ]}
      highlights={[
        { title: "Item Control", description: "Track rentable assets, readiness status, and asset availability." },
        { title: "Booking Desk", description: "Manage reservations and rental utilisation against asset capacity." },
        { title: "Agreement Discipline", description: "Keep commercial commitments and booking-to-contract handoff aligned." },
        { title: "Maintenance Support", description: "Protect rental availability with planned servicing and issue control." },
      ]}
      workflow={[
        "Rental assets are prepared and exposed for bookings with status visibility.",
        "Customer booking moves into a tracked rental agreement before release.",
        "Maintenance keeps assets rentable and reduces downtime between bookings.",
        "Usage, readiness, and commercial coverage are monitored together.",
      ]}
    />
  );
}
