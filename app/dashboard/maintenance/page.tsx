"use client";

import { BusinessVerticalShell } from "../_components/BusinessVerticalShell";

export default function MaintenanceOverviewPage() {
  return (
    <BusinessVerticalShell
      title="Maintenance Overview"
      subtitle="AMC contracts, service scheduling, field jobs, and parts support for maintenance businesses."
      mode="overview"
      accent="#34d399"
      links={[
        { label: "AMC Contracts", href: "/dashboard/maintenance/contracts" },
        { label: "Service Schedule", href: "/dashboard/maintenance/schedule" },
        { label: "Service Jobs", href: "/dashboard/maintenance/jobs" },
        { label: "Parts & Stock", href: "/dashboard/maintenance/parts" },
        { label: "Analytics", href: "/dashboard/maintenance/analytics" },
      ]}
      highlights={[
        { title: "Contract Desk", description: "Track AMC value, coverage commitments, and service obligations cleanly." },
        { title: "Schedule Control", description: "Plan preventive visits, due work, and on-time service execution." },
        { title: "Field Jobs", description: "Manage active service jobs, issue logs, and completion discipline." },
        { title: "Parts Support", description: "Keep replacement parts and stock support tied to live service work." },
      ]}
      workflow={[
        "Maintenance contracts define service scope and periodic obligations.",
        "Schedules convert due visits into tracked field jobs and technician work.",
        "Parts and service notes are captured against each maintenance activity.",
        "Completion data feeds back into contract health and renewal quality.",
      ]}
    />
  );
}
