import type { Metadata } from "next";

const BASE = process.env.NEXT_PUBLIC_BASE_URL || "https://finovaos.app";

export const metadata: Metadata = {
  title: "Product Changelog — What's New at FinovaOS",
  description:
    "Stay up to date with the latest FinovaOS releases, new features, improvements, and bug fixes. We ship updates every week based on customer feedback.",
  keywords: [
    "FinovaOS changelog",
    "accounting software updates",
    "FinovaOS new features",
    "product releases",
    "SaaS changelog",
    "cloud accounting updates",
  ],
  openGraph: {
    title: "FinovaOS Changelog — Latest Updates & Features",
    description: "New features, improvements, and bug fixes. Updated weekly.",
    url: `${BASE}/changelog`,
    siteName: "FinovaOS",
    images: [{ url: `${BASE}/icon.png`, width: 1200, height: 630, alt: "FinovaOS Changelog" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "FinovaOS Changelog",
    description: "Latest updates, new features, and improvements. Updated weekly.",
    images: [`${BASE}/icon.png`],
  },
  alternates: { canonical: `${BASE}/changelog` },
};

export default function ChangelogLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
