import type { Metadata } from "next";

const BASE = process.env.NEXT_PUBLIC_BASE_URL || "https://finovaos.app";

export const metadata: Metadata = {
  title: "About FinovaOS — Our Mission, Team & Story",
  description:
    "Learn about FinovaOS's mission to simplify business finance for 12,000+ businesses across 40+ countries. Trusted by traders, distributors, and enterprises worldwide. $2.4B+ transactions processed.",
  keywords: [
    "about FinovaOS",
    "FinovaOS team",
    "cloud accounting company",
    "accounting software company",
    "SME fintech",
    "financial management platform",
    "FinovaOS mission",
    "global accounting software company",
  ],
  openGraph: {
    title: "About FinovaOS — Our Mission & Team",
    description:
      "12,000+ businesses. 40+ countries. $2.4B+ transactions processed. FinovaOS is on a mission to make financial management simple for every business.",
    url: `${BASE}/about`,
    siteName: "FinovaOS",
    images: [{ url: `${BASE}/icon.png`, width: 1200, height: 630, alt: "About FinovaOS" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "About FinovaOS",
    description: "12,000+ businesses. 40+ countries. Our mission is to make financial management simple.",
    images: [`${BASE}/icon.png`],
  },
  alternates: { canonical: `${BASE}/about` },
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name: "About FinovaOS",
    url: `${BASE}/about`,
    description: "Learn about FinovaOS's mission to simplify business finance for SMEs worldwide.",
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: BASE },
        { "@type": "ListItem", position: 2, name: "About", item: `${BASE}/about` },
      ],
    },
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {children}
    </>
  );
}
