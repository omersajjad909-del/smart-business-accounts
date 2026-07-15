import type { Metadata } from "next";
import { headers } from "next/headers";

const BASE = process.env.NEXT_PUBLIC_BASE_URL || "https://www.finovaos.app";

export const metadata: Metadata = {
  title: "Careers at FinovaOS — Join Our Global Team",
  description:
    "Work at FinovaOS: remote-first, equity included, health coverage, learning budget. Global team, weekly shipping culture. We're hiring in engineering, product, and sales.",
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
    title: "Careers at FinovaOS — Join Our Global Team",
    description:
      "Remote-first. Equity. Health coverage. Learning budget. Join us and build the future of business finance.",
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

// ── Shared schema helpers ─────────────────────────────────────────────────────
const HIRING_ORG = {
  "@type": "Organization",
  name: "FinovaOS",
  sameAs: BASE,
  logo: `${BASE}/icon.png`,
};

const VALID_THROUGH = "2026-10-15";

const REMOTE_LOCATION = {
  "@type": "Place",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Karachi",
    addressRegion: "Sindh",
    addressCountry: "PK",
    postalCode: "74000",
  },
};

const DUBAI_LOCATION = {
  "@type": "Place",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Dubai",
    addressRegion: "Dubai",
    addressCountry: "AE",
    postalCode: "00000",
  },
};

const LONDON_LOCATION = {
  "@type": "Place",
  address: {
    "@type": "PostalAddress",
    addressLocality: "London",
    addressRegion: "England",
    addressCountry: "GB",
    postalCode: "EC1A 1BB",
  },
};

function remoteJob(title: string, description: string, datePosted: string) {
  return {
    "@type": "JobPosting",
    title,
    description,
    datePosted,
    validThrough: VALID_THROUGH,
    employmentType: "FULL_TIME",
    hiringOrganization: HIRING_ORG,
    jobLocationType: "TELECOMMUTE",
    applicantLocationRequirements: { "@type": "Country", name: "Worldwide" },
    jobLocation: REMOTE_LOCATION,
    url: `${BASE}/careers`,
  };
}

function officeJob(
  title: string,
  description: string,
  datePosted: string,
  location: object,
  employmentType = "FULL_TIME",
  remoteAllowed = false,
  applicantCountry?: string,
) {
  return {
    "@type": "JobPosting",
    title,
    description,
    datePosted,
    validThrough: VALID_THROUGH,
    employmentType,
    hiringOrganization: HIRING_ORG,
    ...(remoteAllowed
      ? {
          jobLocationType: "TELECOMMUTE",
          applicantLocationRequirements: {
            "@type": "Country",
            name: applicantCountry ?? "Worldwide",
          },
        }
      : {}),
    jobLocation: location,
    url: `${BASE}/careers`,
  };
}

// ── JobPosting schema for all 18 roles ────────────────────────────────────────
const jobPostings = [
  remoteJob(
    "Senior Backend Engineer",
    "Build the core financial infrastructure powering businesses worldwide. Work with Prisma, Next.js, PostgreSQL, and distributed systems at scale.",
    "2026-07-12",
  ),
  remoteJob(
    "Frontend Engineer (React)",
    "Own the user-facing product experience. We move fast and ship weekly. You'll work directly with product and design to build features users love.",
    "2026-07-12",
  ),
  remoteJob(
    "DevOps / Platform Engineer",
    "Own our cloud infrastructure. We run on AWS, Kubernetes, and care deeply about latency, reliability, and zero-downtime deployments.",
    "2026-07-08",
  ),
  remoteJob(
    "Mobile Engineer (React Native)",
    "Build our iOS and Android apps from scratch. You'll set the architecture and shape the mobile experience for thousands of daily users.",
    "2026-07-08",
  ),
  remoteJob(
    "Security Engineer",
    "Protect financial data globally. Own pen testing, SOC 2 compliance, security reviews, and incident response.",
    "2026-07-01",
  ),
  remoteJob(
    "Product Manager — Accounting",
    "Own the core accounting product. Define roadmap, write specs, work with engineers and designers to ship features that delight accountants.",
    "2026-07-10",
  ),
  remoteJob(
    "Senior Product Designer",
    "Design beautiful, intuitive financial tools. We care deeply about craft. Work on complex flows — invoicing, reconciliation, payroll — and make them simple.",
    "2026-07-10",
  ),
  remoteJob(
    "UX Researcher",
    "Talk to customers, uncover pain points, translate insights into product decisions. Be the customer's voice inside our product team.",
    "2026-07-08",
  ),
  officeJob(
    "Account Executive — MENA",
    "Close enterprise deals across the Middle East. You'll own the full sales cycle — from demo to signed contract — for our fastest-growing region.",
    "2026-07-13",
    DUBAI_LOCATION,
  ),
  officeJob(
    "Account Executive — UK/EU",
    "Build our UK and European business from the ground up. Significant equity upside for the right candidate who can open new markets.",
    "2026-07-13",
    LONDON_LOCATION,
    "FULL_TIME",
    true,
    "United Kingdom",
  ),
  remoteJob(
    "Partnerships Manager",
    "Build our reseller and integration partner ecosystem. Own relationships with accounting firms, ERP vendors, and local channel partners.",
    "2026-07-08",
  ),
  remoteJob(
    "Growth Marketing Manager",
    "Own demand gen, SEO, paid acquisition, and product-led growth. Analytical, creative, and hungry to grow a global SaaS brand.",
    "2026-07-08",
  ),
  remoteJob(
    "Finance & Accounting Manager",
    "Manage FinovaOS's own finances. Own month-end close, financial reporting, and help us practice what we preach.",
    "2026-07-12",
  ),
  remoteJob(
    "People Operations Manager",
    "Build the systems that help our remote team thrive. Own hiring ops, onboarding, performance cycles, and team culture.",
    "2026-07-08",
  ),
  officeJob(
    "Legal & Compliance Counsel",
    "Navigate financial regulations globally. Support GDPR, data privacy, commercial contracts, and regional compliance requirements.",
    "2026-07-01",
    REMOTE_LOCATION,
    "CONTRACTOR",
    true,
  ),
  remoteJob(
    "Customer Success Manager",
    "Own a portfolio of Pro and Enterprise customers. Reduce churn, drive adoption, run QBRs, and be the trusted advisor our customers deserve.",
    "2026-07-11",
  ),
  remoteJob(
    "Technical Support Engineer",
    "Solve complex technical issues for our business customers. Bridge the gap between customers and engineering. Know the product inside out.",
    "2026-07-11",
  ),
  remoteJob(
    "Onboarding Specialist",
    "Help new customers get up and running fast. Run live onboarding sessions, create training materials, and make first impressions count.",
    "2026-07-08",
  ),
];

const webPageJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "Careers at FinovaOS",
  url: `${BASE}/careers`,
  description:
    "Join FinovaOS: remote-first, equity included, health coverage, learning budget. Hiring in engineering, product, and sales.",
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
      <script
        nonce={nonce}
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": jobPostings,
          }),
        }}
      />
      {children}
    </>
  );
}
