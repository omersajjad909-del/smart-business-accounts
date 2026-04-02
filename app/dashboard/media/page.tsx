"use client";

import { BusinessVerticalShell } from "../_components/BusinessVerticalShell";

export default function MediaOverviewPage() {
  return (
    <BusinessVerticalShell
      title="Media Overview"
      subtitle="Campaign delivery, client management, media planning, and commercial coordination."
      mode="overview"
      accent="#a78bfa"
      links={[
        { label: "Campaigns", href: "/dashboard/media/campaigns" },
        { label: "Clients", href: "/dashboard/media/clients" },
        { label: "Media Plan", href: "/dashboard/media/media-plan" },
        { label: "Analytics", href: "/dashboard/media/analytics" },
      ]}
      highlights={[
        { title: "Campaign Desk", description: "Organize campaigns, dates, deliverables, and execution milestones." },
        { title: "Client Portfolio", description: "Track active clients, brief ownership, and commercial continuity." },
        { title: "Media Planning", description: "Structure channels, placements, and planning discipline before launch." },
        { title: "Commercial Flow", description: "Tie campaigns back to quotations, billing rhythm, and account health." },
      ]}
      workflow={[
        "Client brief enters the system and becomes a planned campaign.",
        "Media plan maps channels, timing, placements, and production expectations.",
        "Execution moves through campaign delivery with client checkpoints.",
        "Performance and commercials are reviewed before closure or renewal.",
      ]}
    />
  );
}
