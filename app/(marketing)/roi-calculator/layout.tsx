import type { Metadata } from "next";

const BASE = process.env.NEXT_PUBLIC_BASE_URL || "https://www.finovaos.app";
const URL = `${BASE}/roi-calculator`;

// See the comment in case-studies/layout.tsx — this page had no metadata of
// its own and was falling back to the site-wide default, identical to three
// other pages.
export const metadata: Metadata = {
  title: "ROI Calculator",
  description:
    "Estimate how much time and money your business could save by switching to FinovaOS — enter your numbers and see the projection.",
  openGraph: {
    title: "ROI Calculator — FinovaOS",
    description: "Estimate how much time and money your business could save by switching to FinovaOS.",
    url: URL,
    siteName: "FinovaOS",
    images: [{ url: `${BASE}/icon.png`, width: 1200, height: 630, alt: "FinovaOS ROI Calculator" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ROI Calculator — FinovaOS",
    description: "Estimate how much time and money your business could save by switching to FinovaOS.",
    images: [`${BASE}/icon.png`],
  },
  alternates: { canonical: URL },
};

export default function RoiCalculatorLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
