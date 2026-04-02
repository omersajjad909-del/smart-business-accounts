"use client";

import { BusinessVerticalShell } from "../../_components/BusinessVerticalShell";

export default function UtilityMetersPage() {
  return (
    <BusinessVerticalShell
      title="Meter Readings"
      subtitle="Usage capture, field discipline, and billing-input readiness for utility operators."
      mode="overview"
      accent="#38bdf8"
      links={[
        { label: "Overview", href: "/dashboard/utilities" },
        { label: "Connections", href: "/dashboard/utilities/connections" },
        { label: "Utility Billing", href: "/dashboard/utilities/billing" },
        { label: "Analytics", href: "/dashboard/utilities/analytics" },
      ]}
      highlights={[
        { title: "Reading Capture", description: "Track field-input readiness before the billing cycle begins." },
        { title: "Usage Visibility", description: "Improve confidence in billed usage with operational checks." },
        { title: "Field Discipline", description: "Tie meter-reading completion back to service-account coverage." },
        { title: "Billing Input Quality", description: "Reduce billing errors by tightening the usage collection step." },
      ]}
      workflow={[
        "Field teams collect readings or usage inputs for active service accounts.",
        "Input quality is reviewed before billing is generated downstream.",
        "Weak reading coverage is surfaced before it causes billing delay or error.",
        "The cycle closes with cleaner operational support for finance recovery.",
      ]}
    />
  );
}
