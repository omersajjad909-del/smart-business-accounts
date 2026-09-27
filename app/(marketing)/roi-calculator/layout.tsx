import type { Metadata } from "next";

const BASE = process.env.NEXT_PUBLIC_BASE_URL || "https://www.finovaos.app";
const URL = `${BASE}/roi-calculator`;

// This page had no metadata of its own, so it fell back to the marketing
// layout's site-wide default title — the same string several other pages
// used, which a crawler reported as duplicate titles.
export const metadata: Metadata = {
  // Retitled from a bare "ROI Calculator" — Search Console showed real
  // impressions for "cloud accounting roi calculator" landing on this page
  // with zero clicks, which is what a title that doesn't echo the query back
  // to the searcher looks like.
  title: "Cloud Accounting ROI Calculator",
  keywords: ["cloud accounting roi calculator", "accounting software roi calculator", "erp roi calculator"],
  description:
    "Estimate how much time and money your business could save by switching to cloud accounting software — enter your numbers and see the projection.",
  openGraph: {
    title: "Cloud Accounting ROI Calculator — FinovaOS",
    description: "Estimate how much time and money your business could save by switching to cloud accounting software.",
    url: URL,
    siteName: "FinovaOS",
    images: [{ url: `${BASE}/icon.png`, width: 1200, height: 630, alt: "FinovaOS ROI Calculator" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Cloud Accounting ROI Calculator — FinovaOS",
    description: "Estimate how much time and money your business could save by switching to cloud accounting software.",
    images: [`${BASE}/icon.png`],
  },
  alternates: { canonical: URL },
};

export default function RoiCalculatorLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
