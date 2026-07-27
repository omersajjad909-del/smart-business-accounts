import type { Metadata } from "next";

const FORGE_URL = "https://finovaforge.com";
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://www.finovaos.app";
const FORGE_TITLE = "Finova Forge - Industry-Specific Business Software | Trading, Manufacturing, Restaurant, Retail & More";
const FORGE_DESCRIPTION =
  "Finova Forge is a software company building intelligent, industry-specific business tools — trading, wholesale, manufacturing, distribution, restaurant, retail, import/export, construction, hospital, school, pharmacy, and more. Creators of FinovaOS.";
const FORGE_OG_IMAGE = "/FinovaForge.png";

export const metadata: Metadata = {
  metadataBase: new URL(FORGE_URL),
  title: FORGE_TITLE,
  description: FORGE_DESCRIPTION,
  applicationName: "Finova Forge",
  authors: [{ name: "Umer Sajjad", url: "https://www.linkedin.com/in/umer-sajjad-657936417" }, { name: "Finova Forge", url: FORGE_URL }],
  creator: "Umer Sajjad",
  publisher: "Finova Forge",
  keywords: [
    "Finova Forge", "FinovaOS", "software company Pakistan",
    "industry-specific business software", "AI business software",
    "Umer Sajjad", "Finova Forge founder",
    // Industries
    "trading business software", "wholesale accounting software",
    "manufacturing ERP", "distribution management software",
    "restaurant management software", "restaurant POS software",
    "retail accounting software", "retail POS software",
    "import export software", "clearing forwarding software",
    "construction accounting software", "hospital management software",
    "school management software", "pharmacy management software",
    "transport management software", "real estate accounting software",
    "hotel management software", "NGO accounting software",
    "IT company accounting software", "law firm billing software",
    "salon management software", "gym management software",
    "ecommerce accounting software", "agriculture accounting software",
    // Platform
    "cloud ERP Pakistan", "cloud accounting Pakistan",
    "SaaS Pakistan", "business software Lahore",
    "PSEB registered software company", "IT exporter Pakistan",
  ],
  icons: {
    icon: [
      { url: "/FinovaForge.png", sizes: "32x32", type: "image/png" },
      { url: "/FinovaForge.png", sizes: "192x192", type: "image/png" },
      { url: "/FinovaForge.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/FinovaForge.png", sizes: "180x180", type: "image/png" }],
    shortcut: "/FinovaForge.png",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: FORGE_URL,
    siteName: "Finova Forge",
    title: FORGE_TITLE,
    description: FORGE_DESCRIPTION,
    images: [
      {
        url: FORGE_OG_IMAGE,
        width: 1024,
        height: 1024,
        alt: "Finova Forge",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: FORGE_TITLE,
    description: FORGE_DESCRIPTION,
    images: [FORGE_OG_IMAGE],
  },
  alternates: {
    canonical: FORGE_URL,
  },
};

const forgeOrganizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${BASE_URL}/#organization`,
  name: "Finova Forge",
  alternateName: "FinovaOS",
  url: FORGE_URL,
  logo: {
    "@type": "ImageObject",
    url: `${FORGE_URL}/FinovaForge.png`,
    width: 512,
    height: 512,
  },
  description: "Finova Forge is a PSEB Registered IT Exporter based in Faisalabad, Pakistan — founded in 2025 by Umer Sajjad. We build FinovaOS, an AI-powered cloud ERP & accounting platform for 22+ industries with 50+ modules.",
  foundingDate: "2025",
  foundingLocation: {
    "@type": "Place",
    name: "Faisalabad, Pakistan",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Faisalabad",
      addressCountry: "PK",
    },
  },
  founder: {
    "@type": "Person",
    name: "Umer Sajjad",
    jobTitle: "Founder & CEO",
    url: `${BASE_URL}/forge/about`,
    sameAs: ["https://www.linkedin.com/in/umer-sajjad-657936417"],
  },
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "customer service",
    email: "hello@finovaos.app",
    availableLanguage: ["English", "Urdu"],
  },
  sameAs: [
    `${BASE_URL}`,
    "https://www.linkedin.com/in/umer-sajjad-657936417",
    "https://www.wikidata.org/wiki/Q140701786",
  ],
};

const forgePersonJsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: "Umer Sajjad",
  jobTitle: "Founder & CEO",
  worksFor: {
    "@type": "Organization",
    name: "Finova Forge",
    url: FORGE_URL,
  },
  url: `${BASE_URL}/forge/about`,
  sameAs: [
    "https://www.linkedin.com/in/umer-sajjad-657936417",
    "https://www.wikidata.org/wiki/Q140701676",
    `${BASE_URL}/forge/about`,
    `${BASE_URL}/about`,
  ],
  address: {
    "@type": "PostalAddress",
    addressLocality: "Faisalabad",
    addressCountry: "PK",
  },
  description: "Umer Sajjad is the Founder and CEO of Finova Forge — a PSEB Registered IT Exporter from Lahore, Pakistan — and creator of FinovaOS, an AI cloud ERP platform serving 22+ industries.",
};

export default function ForgeLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(forgeOrganizationJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(forgePersonJsonLd) }} />
      {children}
    </>
  );
}
