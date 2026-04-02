"use client";

import { BusinessVerticalShell } from "../../_components/BusinessVerticalShell";

export default function MediaAnalyticsPage() {
  return (
    <BusinessVerticalShell
      title="Media Analytics"
      subtitle="Campaign load, client spread, planning visibility, and commercial focus areas."
      mode="analytics"
      accent="#a78bfa"
      links={[
        { label: "Overview", href: "/dashboard/media" },
        { label: "Campaigns", href: "/dashboard/media/campaigns" },
        { label: "Clients", href: "/dashboard/media/clients" },
        { label: "Media Plan", href: "/dashboard/media/media-plan" },
      ]}
      highlights={[
        { title: "Campaign Mix", description: "Review the balance of active, delayed, and upcoming campaign work." },
        { title: "Client Exposure", description: "Understand concentration across major accounts and client dependency." },
        { title: "Planning Quality", description: "Check whether campaigns are moving with enough plan detail and readiness." },
        { title: "Commercial Focus", description: "Prioritize where renewals, upsells, or intervention should happen next." },
      ]}
      workflow={[
        "Campaign pipeline is assessed across active clients and upcoming work.",
        "Media plan quality is compared against execution pressure and deadlines.",
        "High-dependency accounts are surfaced for commercial attention.",
        "Leadership uses the reading to rebalance team focus and client strategy.",
      ]}
    />
  );
}
