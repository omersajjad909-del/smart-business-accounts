import type { Metadata } from "next";

const BASE = process.env.NEXT_PUBLIC_BASE_URL || "https://www.finovaos.app";
const URL = `${BASE}/compare`;

// See the comment in case-studies/layout.tsx — this page had no metadata of
// its own and was falling back to the site-wide default, identical to three
// other pages.
export const metadata: Metadata = {
  title: "Compare FinovaOS vs Competitors",
  description:
    "How FinovaOS compares to Xero, QuickBooks, Zoho Books and Wave — feature by feature, with honest limitations named on both sides.",
  openGraph: {
    title: "Compare FinovaOS vs Competitors",
    description: "Feature-by-feature comparisons against Xero, QuickBooks, Zoho Books and Wave.",
    url: URL,
    siteName: "FinovaOS",
    images: [{ url: `${BASE}/icon.png`, width: 1200, height: 630, alt: "Compare FinovaOS" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Compare FinovaOS vs Competitors",
    description: "Feature-by-feature comparisons against Xero, QuickBooks, Zoho Books and Wave.",
    images: [`${BASE}/icon.png`],
  },
  alternates: { canonical: URL },
};

export default function CompareLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
