import type { Metadata } from "next";

const BASE = process.env.NEXT_PUBLIC_BASE_URL || "https://www.finovaos.app";

export const metadata: Metadata = {
  title: "About FinovaOS — Our Mission, Story & Values",
  description:
    "Learn about FinovaOS's mission to simplify business finance for trading, wholesale, and distribution businesses. Purpose-built for how real businesses actually work.",
  keywords: [
    "about FinovaOS",
    "FinovaOS story",
    "cloud accounting company",
    "accounting software company",
    "SME fintech software",
    "financial management platform",
    "FinovaOS mission",
    "trading business accounting software",
  ],
  openGraph: {
    title: "About FinovaOS — Our Mission & Story",
    description:
      "FinovaOS is on a mission to make financial management simple for trading, wholesale, and distribution businesses worldwide.",
    url: `${BASE}/about`,
    siteName: "FinovaOS",
    images: [{ url: `${BASE}/icon.png`, width: 1200, height: 630, alt: "About FinovaOS" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "About FinovaOS",
    description: "Purpose-built for trading businesses. Our mission is to make financial management simple.",
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
