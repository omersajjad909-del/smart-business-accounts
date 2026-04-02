"use client";

import { BusinessVerticalShell } from "../../_components/BusinessVerticalShell";

export default function WorkshopAnalyticsPage() {
  return (
    <BusinessVerticalShell
      title="Workshop Analytics"
      subtitle="Throughput, mechanic utilization, parts burn, and warranty-risk reading for service operations."
      mode="analytics"
      accent="#f59e0b"
      links={[
        { label: "Overview", href: "/dashboard/workshop" },
        { label: "Job Cards", href: "/dashboard/workshop/jobs" },
        { label: "Parts Used", href: "/dashboard/workshop/parts" },
        { label: "Mechanics", href: "/dashboard/workshop/mechanics" },
        { label: "Warranty", href: "/dashboard/workshop/warranty" },
      ]}
      highlights={[
        { title: "Open Jobs", description: "Read pending service load and identify delivery-pressure days early." },
        { title: "Mechanic Load", description: "Compare technician allocation with active repairs and job ageing." },
        { title: "Parts Burn", description: "Watch which jobs consume the most inventory and margin-sensitive parts." },
        { title: "Warranty Exposure", description: "Flag repeat issues and jobs likely to return under warranty." },
      ]}
      workflow={[
        "Service volume is reviewed against mechanic availability and pending deliveries.",
        "Parts intensity is compared across jobs to highlight costly service patterns.",
        "Warranty and repeat-repair visibility protects customer trust and workshop margin.",
        "Management uses these signals to rebalance labour, stock, and turnaround promises.",
      ]}
    />
  );
}
