import type { Metadata } from "next";

const BASE = process.env.NEXT_PUBLIC_BASE_URL || "https://finovaos.app";

export const metadata: Metadata = {
  title: "Careers at FinovaOS — Join Our Global Team of 120+",
  description:
    "Work at FinovaOS: remote-first, equity included, health coverage, learning budget. 18+ countries, 4.8★ Glassdoor rating. We're hiring in engineering, product, and sales.",
  keywords: [
    "FinovaOS careers",
    "fintech jobs",
    "accounting software jobs",
    "remote software jobs",
    "SaaS startup careers",
    "cloud accounting jobs",
    "fintech engineering jobs",
    "product manager jobs fintech",
  ],
  openGraph: {
    title: "Careers at FinovaOS — Join Our 120+ Team",
    description:
      "Remote-first. Equity. Health coverage. Learning budget. 4.8★ Glassdoor. Join us and build the future of business finance.",
    url: `${BASE}/careers`,
    siteName: "FinovaOS",
    images: [{ url: `${BASE}/icon.png`, width: 1200, height: 630, alt: "Careers at FinovaOS" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Join FinovaOS — We're Hiring",
    description: "Remote-first, equity, health coverage. 4.8★ Glassdoor. Join our global team.",
    images: [`${BASE}/icon.png`],
  },
  alternates: { canonical: `${BASE}/careers` },
};

export default function CareersLayout({ children }: { children: React.ReactNode }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    hiringOrganization: {
      "@type": "Organization",
      name: "FinovaOS",
      sameAs: BASE,
      logo: `${BASE}/icon.png`,
    },
    jobLocation: { "@type": "Place", address: "Remote — Worldwide" },
    employmentType: "FULL_TIME",
    description: "Multiple positions available in engineering, product, sales, and support.",
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {children}
    </>
  );
}
