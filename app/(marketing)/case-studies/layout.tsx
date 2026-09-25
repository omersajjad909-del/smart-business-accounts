import type { Metadata } from "next";

const BASE = process.env.NEXT_PUBLIC_BASE_URL || "https://www.finovaos.app";
const URL = `${BASE}/case-studies`;

// This page had no metadata of its own, so it fell back to the marketing
// layout's site-wide default title/description — the exact same string that
// /compare, /integrations and /roi-calculator were also silently falling
// back to, which is what made all four look like duplicate pages to a
// crawler ("duplicate_title" across 4 pages, confirmed by a live OpenRush
// audit on 2026-09-25).
export const metadata: Metadata = {
  title: "Customer Case Studies",
  description:
    "Real businesses running on FinovaOS — trading, distribution, retail and manufacturing companies, the problems they had before switching, and the results after.",
  openGraph: {
    title: "Customer Case Studies — FinovaOS",
    description: "Real businesses running on FinovaOS, and the results after switching.",
    url: URL,
    siteName: "FinovaOS",
    images: [{ url: `${BASE}/icon.png`, width: 1200, height: 630, alt: "FinovaOS Case Studies" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Customer Case Studies — FinovaOS",
    description: "Real businesses running on FinovaOS, and the results after switching.",
    images: [`${BASE}/icon.png`],
  },
  alternates: { canonical: URL },
};

export default function CaseStudiesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
