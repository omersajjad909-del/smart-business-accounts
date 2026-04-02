"use client";

import { BusinessVerticalShell } from "../../_components/BusinessVerticalShell";

export default function UtilityAnalyticsPage() {
  return (
    <BusinessVerticalShell
      title="Utility Analytics"
      subtitle="Service-account visibility, billing recovery, meter discipline, and operating pressure areas."
      mode="analytics"
      accent="#38bdf8"
      links={[
        { label: "Overview", href: "/dashboard/utilities" },
        { label: "Connections", href: "/dashboard/utilities/connections" },
        { label: "Utility Billing", href: "/dashboard/utilities/billing" },
        { label: "Meter Readings", href: "/dashboard/utilities/meters" },
      ]}
      highlights={[
        { title: "Account Base", description: "Monitor active service footprint and customer-account spread." },
        { title: "Billing Recovery", description: "Track dues pressure and service-linked receivable concentration." },
        { title: "Reading Coverage", description: "See how complete and reliable field-input cycles are becoming." },
        { title: "Operational Pressure", description: "Combine billing, service, and field indicators into one view." },
      ]}
      workflow={[
        "Connection base is reviewed against billing and field-input health.",
        "Receivable pressure is assessed alongside service continuity exposure.",
        "Weak reading discipline is surfaced before it hits billing quality.",
        "Management uses the reading to tighten both utility service and recovery.",
      ]}
    />
  );
}
