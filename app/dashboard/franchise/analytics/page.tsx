"use client";

import { BusinessVerticalShell } from "../../_components/BusinessVerticalShell";

export default function FranchiseAnalyticsPage() {
  return (
    <BusinessVerticalShell
      title="Franchise Analytics"
      subtitle="Outlet spread, royalty exposure, network health, and scale-management focus."
      mode="analytics"
      accent="#22c55e"
      links={[
        { label: "Overview", href: "/dashboard/franchise" },
        { label: "Outlets", href: "/dashboard/franchise/outlets" },
        { label: "Royalty", href: "/dashboard/franchise/royalty" },
      ]}
      highlights={[
        { title: "Outlet Mix", description: "See network size, active outlets, and rollout momentum at a glance." },
        { title: "Royalty Exposure", description: "Read how much recurring royalty value is tied to the network base." },
        { title: "Network Health", description: "Identify weak outlets, uneven scale, or areas needing closer oversight." },
        { title: "Expansion Focus", description: "Support better decisions on rollout, consolidation, or franchise support." },
      ]}
      workflow={[
        "Active franchise base is reviewed with rollout and outlet status visibility.",
        "Royalty recovery is compared against network growth and active locations.",
        "Weak nodes and concentration risks are surfaced for management action.",
        "Expansion strategy is then guided by network health instead of guesswork.",
      ]}
    />
  );
}
