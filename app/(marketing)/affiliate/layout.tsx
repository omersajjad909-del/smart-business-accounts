import type { Metadata } from "next";

const BASE = process.env.NEXT_PUBLIC_BASE_URL || "https://finovaos.app";

export const metadata: Metadata = {
  title: "Affiliate Program — Earn 20–35% Recurring Commission",
  description:
    "Join Finova's affiliate program and earn 20–35% recurring commission on every business you refer. Instant dashboard, monthly payouts, no earnings cap. Starter to Elite tiers available.",
  keywords: [
    "Finova affiliate program",
    "accounting software affiliate",
    "recurring commission affiliate",
    "SaaS affiliate program",
    "fintech affiliate",
    "earn referring accounting software",
    "business software referral program",
  ],
  openGraph: {
    title: "Finova Affiliate Program — Earn Up to 35% Commission",
    description:
      "Earn 20–35% recurring commission for every business you refer. Starter ($200/mo), Growth ($750/mo), Pro ($2,400/mo), Elite (custom). No earnings cap.",
    url: `${BASE}/affiliate`,
    siteName: "Finova",
    images: [{ url: `${BASE}/icon.png`, width: 1200, height: 630, alt: "Finova Affiliate Program" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Finova Affiliate Program — Up to 35% Commission",
    description: "Earn recurring commission for every business you refer. No cap. Monthly payouts.",
    images: [`${BASE}/icon.png`],
  },
  alternates: { canonical: `${BASE}/affiliate` },
};

export default function AffiliateLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
