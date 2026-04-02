"use client";

import { BusinessVerticalShell } from "../_components/BusinessVerticalShell";

export default function WorkshopOverviewPage() {
  return (
    <BusinessVerticalShell
      title="Workshop Overview"
      subtitle="Vehicle service jobs, parts consumption, mechanics coverage, and warranty exposure."
      mode="overview"
      accent="#f59e0b"
      links={[
        { label: "Job Cards", href: "/dashboard/workshop/jobs" },
        { label: "Parts Used", href: "/dashboard/workshop/parts" },
        { label: "Mechanics", href: "/dashboard/workshop/mechanics" },
        { label: "Warranty", href: "/dashboard/workshop/warranty" },
        { label: "Analytics", href: "/dashboard/workshop/analytics" },
      ]}
      highlights={[
        { title: "Job Desk", description: "Track incoming service jobs, inspection notes, and delivery commitments." },
        { title: "Parts Control", description: "Monitor job-level parts usage, parts recovery, and stock-impact visibility." },
        { title: "Mechanic Capacity", description: "Understand team workload, specialist coverage, and open bay allocation." },
        { title: "Warranty Discipline", description: "Keep warranty claims, repeat repairs, and liability follow-up under control." },
      ]}
      workflow={[
        "Vehicle is received, diagnosed, and converted into a tracked job card.",
        "Required spare parts and labour are attached against the active service job.",
        "Mechanics complete work and warranty-sensitive items stay flagged for follow-up.",
        "Job closes only after commercial, service, and delivery handoff are aligned.",
      ]}
    />
  );
}
