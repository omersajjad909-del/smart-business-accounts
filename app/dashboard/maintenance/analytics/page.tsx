"use client";

import { BusinessVerticalShell } from "../../_components/BusinessVerticalShell";

export default function MaintenanceAnalyticsPage() {
  return (
    <BusinessVerticalShell
      title="Maintenance Analytics"
      subtitle="Contract health, schedule adherence, job completion, and service-parts consumption."
      mode="analytics"
      accent="#34d399"
      links={[
        { label: "Overview", href: "/dashboard/maintenance" },
        { label: "AMC Contracts", href: "/dashboard/maintenance/contracts" },
        { label: "Service Schedule", href: "/dashboard/maintenance/schedule" },
        { label: "Service Jobs", href: "/dashboard/maintenance/jobs" },
        { label: "Parts & Stock", href: "/dashboard/maintenance/parts" },
      ]}
      highlights={[
        { title: "AMC Coverage", description: "See which contracts are active, at risk, or over-consuming service effort." },
        { title: "Schedule Adherence", description: "Track delayed visits, overdue work, and preventive-service discipline." },
        { title: "Job Throughput", description: "Measure closure rhythm and open field jobs against contract promises." },
        { title: "Parts Dependency", description: "Read which service lines are most dependent on stock support." },
      ]}
      workflow={[
        "Contract obligations are compared against completed and overdue service visits.",
        "Open field jobs are reviewed with schedule slippage and team coverage.",
        "Parts demand is tied back to service patterns and contract mix.",
        "Leadership uses this view to improve renewals, staffing, and preventive maintenance quality.",
      ]}
    />
  );
}
