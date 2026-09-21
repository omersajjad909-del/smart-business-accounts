import type { Metadata } from "next";
import { headers } from "next/headers";

const BASE = process.env.NEXT_PUBLIC_BASE_URL || "https://www.finovaos.app";

export const metadata: Metadata = {
  title: "Careers at FinovaOS",
  description:
    "We're not actively hiring right now. Leave your email to hear about FinovaOS roles the moment they open — remote-first, equity included, health coverage, learning budget.",
  keywords: [
    "FinovaOS careers",
    "fintech jobs",
    "accounting software jobs",
    "remote software jobs",
    "SaaS startup careers",
    "cloud accounting jobs",
  ],
  openGraph: {
    title: "Careers at FinovaOS",
    description: "We're not actively hiring right now. Leave your email to hear about roles the moment they open.",
    url: `${BASE}/careers`,
    siteName: "FinovaOS",
    images: [{ url: `${BASE}/icon.png`, width: 1200, height: 630, alt: "Careers at FinovaOS" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Careers at FinovaOS",
    description: "We're not actively hiring right now. Leave your email to hear about roles the moment they open.",
    images: [`${BASE}/icon.png`],
  },
  alternates: { canonical: `${BASE}/careers` },
};

// No JobPosting schema here on purpose. The page itself is a "not actively
// hiring" placeholder — Google's JobPosting rich-result policy requires the
// structured data to match a real, currently-open listing, and generating 18
// synthetic postings that all pointed at this same non-application URL was
// exactly the kind of mismatch that gets a site's structured data disabled
// site-wide. Restore this only alongside real listings.
const webPageJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "Careers at FinovaOS",
  url: `${BASE}/careers`,
  description: "We're not actively hiring right now. Leave your email to hear about FinovaOS roles the moment they open.",
  isPartOf: { "@type": "WebSite", name: "FinovaOS", url: BASE },
  about: { "@type": "Organization", name: "FinovaOS", sameAs: BASE, logo: `${BASE}/icon.png` },
};

export default async function CareersLayout({ children }: { children: React.ReactNode }) {
  const nonce = (await headers()).get("x-nonce") || undefined;
  return (
    <>
      <script
        nonce={nonce}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageJsonLd) }}
      />
      {children}
    </>
  );
}
