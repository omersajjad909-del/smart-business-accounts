"use client";

import { BusinessVerticalShell } from "../_components/BusinessVerticalShell";

export default function UtilitiesOverviewPage() {
  return (
    <BusinessVerticalShell
      title="Utility Operations Overview"
      subtitle="Connections, billing cycles, meter readings, and service continuity for regulated utility operations."
      mode="overview"
      accent="#38bdf8"
      links={[
        { label: "Connections", href: "/dashboard/utilities/connections" },
        { label: "Utility Billing", href: "/dashboard/utilities/billing" },
        { label: "Meter Readings", href: "/dashboard/utilities/meters" },
        { label: "Analytics", href: "/dashboard/utilities/analytics" },
      ]}
      highlights={[
        { title: "Customer Connections", description: "Manage active service connections and network-side operating visibility." },
        { title: "Billing Discipline", description: "Keep utility billing cycles, dues, and service recovery aligned." },
        { title: "Meter Reading", description: "Support usage capture and operational discipline around billing inputs." },
        { title: "Service Continuity", description: "Control the bridge between field operations and finance collection." },
      ]}
      workflow={[
        "Customer connection is registered and becomes part of the active service base.",
        "Meter readings or usage assumptions feed the utility billing cycle.",
        "Billing, collection, and service continuity stay connected operationally.",
        "Management reviews exposure, service health, and customer coverage together.",
      ]}
    />
  );
}
