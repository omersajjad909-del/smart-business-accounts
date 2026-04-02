"use client";

import { BusinessVerticalShell } from "../_components/BusinessVerticalShell";

export default function FranchiseOverviewPage() {
  return (
    <BusinessVerticalShell
      title="Franchise Overview"
      subtitle="Outlet expansion, royalty control, and operating visibility across franchise networks."
      mode="overview"
      accent="#22c55e"
      links={[
        { label: "Outlets", href: "/dashboard/franchise/outlets" },
        { label: "Royalty", href: "/dashboard/franchise/royalty" },
        { label: "Analytics", href: "/dashboard/franchise/analytics" },
      ]}
      highlights={[
        { title: "Outlet Desk", description: "Track active outlets, launch status, and operational footprint." },
        { title: "Royalty Control", description: "Monitor royalty rhythm, recovery, and commercial governance." },
        { title: "Network Oversight", description: "Keep standards, outlet health, and commercial discipline aligned." },
        { title: "Scale Visibility", description: "See how the network grows without losing financial and operational control." },
      ]}
      workflow={[
        "New outlet becomes part of the network with status and ownership visibility.",
        "Royalty obligations are tracked against the active outlet base.",
        "Outlet performance and compliance signals feed back into franchise leadership.",
        "The network scales through controlled rollout and clean commercial oversight.",
      ]}
    />
  );
}
