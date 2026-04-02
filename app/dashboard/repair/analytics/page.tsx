"use client";

import { BusinessVerticalShell } from "../../_components/BusinessVerticalShell";

export default function RepairAnalyticsPage() {
  return (
    <BusinessVerticalShell
      title="Repair Analytics"
      subtitle="Job ageing, technician productivity, spare-part intensity, and warranty-return visibility."
      mode="analytics"
      accent="#38bdf8"
      links={[
        { label: "Overview", href: "/dashboard/repair" },
        { label: "Repair Jobs", href: "/dashboard/repair/jobs" },
        { label: "Spare Parts", href: "/dashboard/repair/parts" },
        { label: "Technicians", href: "/dashboard/repair/technicians" },
        { label: "Warranty", href: "/dashboard/repair/warranty" },
      ]}
      highlights={[
        { title: "Job Ageing", description: "Identify repair tickets that are at risk of crossing promised turnaround." },
        { title: "Technician Yield", description: "Compare technician throughput with pending backlog and job complexity." },
        { title: "Parts Cost Pressure", description: "Highlight repair orders where parts usage weakens service margin." },
        { title: "Repeat Failure Risk", description: "Watch warranty returns and recurring issues by category or technician." },
      ]}
      workflow={[
        "Management checks the active queue versus technician coverage.",
        "Costly repairs are reviewed for parts-heavy or low-margin patterns.",
        "Warranty returns are monitored to catch recurring faults early.",
        "Insights feed back into pricing, staffing, and repair process controls.",
      ]}
    />
  );
}
