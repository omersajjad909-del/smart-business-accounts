"use client";

import { BusinessVerticalShell } from "../_components/BusinessVerticalShell";

export default function RepairOverviewPage() {
  return (
    <BusinessVerticalShell
      title="Repair Overview"
      subtitle="Repair jobs, technician capacity, spare parts handling, and warranty support in one desk."
      mode="overview"
      accent="#38bdf8"
      links={[
        { label: "Repair Jobs", href: "/dashboard/repair/jobs" },
        { label: "Spare Parts", href: "/dashboard/repair/parts" },
        { label: "Technicians", href: "/dashboard/repair/technicians" },
        { label: "Warranty", href: "/dashboard/repair/warranty" },
        { label: "Analytics", href: "/dashboard/repair/analytics" },
      ]}
      highlights={[
        { title: "Repair Queue", description: "Track incoming devices, job intake, diagnosis, and promised delivery." },
        { title: "Technician Desk", description: "Balance technician workload, skill fit, and job completion discipline." },
        { title: "Spare Parts", description: "Control replacement parts used against each repair order and item value." },
        { title: "Warranty Follow-up", description: "Manage post-delivery issues, warranty windows, and service accountability." },
      ]}
      workflow={[
        "Repair job is created after device intake and issue diagnosis.",
        "Technician and spare parts are assigned against the active repair ticket.",
        "Work completion and warranty notes are captured before customer handover.",
        "Repeat issues and service quality signals are reviewed after closure.",
      ]}
    />
  );
}
