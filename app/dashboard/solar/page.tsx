"use client";

import { BusinessVerticalShell } from "../_components/BusinessVerticalShell";

export default function SolarOverviewPage() {
  return (
    <BusinessVerticalShell
      title="Solar Overview"
      subtitle="Project delivery, equipment control, AMC scheduling, and post-install support."
      mode="overview"
      accent="#fbbf24"
      links={[
        { label: "Projects", href: "/dashboard/solar/projects" },
        { label: "Equipment Stock", href: "/dashboard/solar/equipment" },
        { label: "AMC Schedule", href: "/dashboard/solar/amc" },
        { label: "Analytics", href: "/dashboard/solar/analytics" },
      ]}
      highlights={[
        { title: "Project Desk", description: "Manage active solar installations, milestones, and commercial handoff." },
        { title: "Equipment Control", description: "Track panels, inverters, and critical stock for ongoing deployments." },
        { title: "AMC Discipline", description: "Keep maintenance contracts and after-sales service on schedule." },
        { title: "Service Continuity", description: "Bridge project execution with post-install support and renewals." },
      ]}
      workflow={[
        "Project begins with planned scope, commercial alignment, and site execution.",
        "Equipment is allocated against projects with stock visibility and control.",
        "After installation, AMC schedules keep service continuity in place.",
        "Service and project insights support long-term customer retention.",
      ]}
    />
  );
}
