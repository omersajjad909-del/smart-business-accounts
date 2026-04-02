import type { Metadata } from "next";

const BASE = process.env.NEXT_PUBLIC_BASE_URL || "https://finovaos.app";

export const metadata: Metadata = {
  title: "Product Changelog â€” What's New at Finova",
  description:
    "Stay up to date with the latest Finova releases, new features, improvements, and bug fixes. We ship updates every week based on customer feedback.",
  keywords: [
    "Finova changelog",
    "accounting software updates",
    "Finova new features",
    "product releases",
    "SaaS changelog",
    "cloud accounting updates",
  ],
  openGraph: {
    title: "Finova Changelog â€” Latest Updates & Features",
    description: "New features, improvements, and bug fixes. Updated weekly.",
    url: `${BASE}/changelog`,
    siteName: "Finova",
    images: [{ url: `${BASE}/icon.png`, width: 1200, height: 630, alt: "Finova Changelog" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Finova Changelog",
    description: "Latest updates, new features, and improvements. Updated weekly.",
    images: [`${BASE}/icon.png`],
  },
  alternates: { canonical: `${BASE}/changelog` },
};

export default function ChangelogLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
