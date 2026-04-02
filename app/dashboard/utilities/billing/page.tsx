"use client";

import { BusinessVerticalShell } from "../../_components/BusinessVerticalShell";

export default function UtilityBillingPage() {
  return (
    <BusinessVerticalShell
      title="Utility Billing"
      subtitle="Billing-cycle control, dues visibility, and receivable discipline for service utilities."
      mode="overview"
      accent="#38bdf8"
      links={[
        { label: "Overview", href: "/dashboard/utilities" },
        { label: "Connections", href: "/dashboard/utilities/connections" },
        { label: "Meter Readings", href: "/dashboard/utilities/meters" },
        { label: "Analytics", href: "/dashboard/utilities/analytics" },
      ]}
      highlights={[
        { title: "Billing Cycle", description: "Run periodic billing with better timing and operational control." },
        { title: "Receivable Focus", description: "Keep due amounts and recovery pressure visible by service base." },
        { title: "Usage-Based Support", description: "Use reading-backed inputs wherever utility operations require them." },
        { title: "Service Recovery", description: "Support collection rhythm without losing customer-service visibility." },
      ]}
      workflow={[
        "Billing starts from active service accounts and confirmed usage inputs.",
        "Receivables and payment pressure are monitored against the billing cycle.",
        "Weak recovery areas are surfaced early for collection follow-up.",
        "Finance and operations stay aligned on service continuity and cash recovery.",
      ]}
    />
  );
}
