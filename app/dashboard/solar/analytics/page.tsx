"use client";

import { BusinessVerticalShell } from "../../_components/BusinessVerticalShell";

export default function SolarAnalyticsPage() {
  return (
    <BusinessVerticalShell
      title="Solar Analytics"
      subtitle="Project visibility, equipment dependency, AMC backlog, and service-continuity focus."
      mode="analytics"
      accent="#fbbf24"
      links={[
        { label: "Overview", href: "/dashboard/solar" },
        { label: "Projects", href: "/dashboard/solar/projects" },
        { label: "Equipment Stock", href: "/dashboard/solar/equipment" },
        { label: "AMC Schedule", href: "/dashboard/solar/amc" },
      ]}
      highlights={[
        { title: "Project Load", description: "Read how many installations are active, delayed, or near closure." },
        { title: "Equipment Exposure", description: "Watch stock-sensitive equipment lines affecting project delivery." },
        { title: "AMC Backlog", description: "Track preventive-service obligations and pending after-sales visits." },
        { title: "Service Stickiness", description: "Measure how strong the project-to-AMC continuity is becoming." },
      ]}
      workflow={[
        "Execution pressure is compared against available equipment and project pipeline.",
        "Service obligations are reviewed after project closure through AMC visibility.",
        "Stock bottlenecks and support gaps are surfaced for leadership action.",
        "This keeps installation performance and post-sale trust moving together.",
      ]}
    />
  );
}
