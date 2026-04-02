"use client";

import { BusinessVerticalShell } from "../../_components/BusinessVerticalShell";

export default function UtilityConnectionsPage() {
  return (
    <BusinessVerticalShell
      title="Connections"
      subtitle="Utility customer base, new activations, and service-account visibility."
      mode="overview"
      accent="#38bdf8"
      links={[
        { label: "Overview", href: "/dashboard/utilities" },
        { label: "Utility Billing", href: "/dashboard/utilities/billing" },
        { label: "Meter Readings", href: "/dashboard/utilities/meters" },
        { label: "Analytics", href: "/dashboard/utilities/analytics" },
      ]}
      highlights={[
        { title: "Active Accounts", description: "Keep a visible base of active and pending service connections." },
        { title: "New Activations", description: "Track newly added service relationships entering the billing cycle." },
        { title: "Coverage Map", description: "Understand the operating footprint and service-account spread." },
        { title: "Operational Readiness", description: "Ensure account setup is complete before billing and field follow-up." },
      ]}
      workflow={[
        "Connection setup creates a service relationship and customer account.",
        "Field readiness and account readiness are checked before activation.",
        "Active connections then move into billing and service support cycles.",
        "Any weak onboarding becomes visible before it becomes a revenue leak.",
      ]}
    />
  );
}
