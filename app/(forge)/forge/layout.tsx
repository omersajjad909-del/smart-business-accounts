import type { Metadata } from "next";
import { headers } from "next/headers";

const FORGE_URL = "https://finovaforge.com";
const FORGE_TITLE = "Finova Forge - Industry-Specific Business Software | Trading, Manufacturing, Restaurant, Retail & More";
// Was 252 chars — over Google's ~160 cutoff on every one of the 14 pages that
// share this constant verbatim, and identical across all of them on top of
// that (a duplicate-description problem, not just a length one).
const FORGE_DESCRIPTION =
  "Finova Forge builds intelligent, industry-specific business software for trading, manufacturing, retail, distribution and more. Creators of FinovaOS.";
const FORGE_OG_IMAGE = "/FinovaForge.png";

/**
 * Forge content is served from two hostnames: finovaforge.com (rewritten onto
 * /forge/* by proxy.ts) and www.finovaos.app/forge/*. Every page here used to
 * declare the same `canonical: FORGE_URL`, so ~26 distinct URLs all claimed to
 * be https://finovaforge.com. Google discards a canonical that self-evidently
 * cannot be true for that many pages and re-clusters them itself, which is what
 * Search Console reports as "Duplicate without user-selected canonical".
 *
 * Each page now self-canonicalises onto finovaforge.com — the domain this
 * content was always meant to own. proxy.ts stamps x-pathname *before* the
 * rewrite, so it holds the public path: `/about` on finovaforge.com and
 * `/forge/about` on finovaos.app. Both normalise to the same canonical, which
 * is what collapses the cross-domain duplication onto one URL.
 */
function forgeCanonical(pathname: string): string {
  const path = pathname.replace(/^\/forge(?=\/|$)/, "");
  // finovaforge.com/ is rewritten to /forge/home, so /home *is* the root page.
  const publicPath = path === "" || path === "/" || path === "/home" ? "" : path;
  return `${FORGE_URL}${publicPath}`;
}

// Every /forge/* page used to share FORGE_TITLE/FORGE_DESCRIPTION verbatim —
// an SEO audit flagged this as a Critical finding (13 pages, one identical
// title and description) since H1s and body content differ per page but the
// <title>/meta description never did. publicPath below is forgeCanonical()'s
// own normalized key (home = ""), so this map and the canonical logic can
// never drift out of sync with each other.
const PAGE_META: Record<string, { title: string; description: string }> = {
  "": { title: FORGE_TITLE, description: FORGE_DESCRIPTION },
  "/about": {
    title: "About Finova Forge — PSEB Registered IT Exporter, Faisalabad",
    description: "Finova Forge is a PSEB Registered IT Exporter based in Faisalabad, Pakistan, founded in 2025 by Umer Sajjad. Meet the team building FinovaOS.",
  },
  "/products": {
    title: "Products — Finova Forge",
    description: "FinovaOS: the cloud ERP and accounting platform Finova Forge builds for trading, manufacturing, retail, distribution and more.",
  },
  "/industries": {
    title: "Industries We Serve — Finova Forge",
    description: "See how FinovaOS supports trading, wholesale, manufacturing, distribution, retail, restaurant and other industries.",
  },
  "/solutions": {
    title: "Solutions — Finova Forge",
    description: "Explore Finova Forge's industry-specific business software solutions, built on the FinovaOS platform.",
  },
  "/blog": {
    title: "Blog — Finova Forge",
    description: "Insights on business software, accounting and industry-specific technology from the Finova Forge team.",
  },
  "/careers": {
    title: "Careers at Finova Forge",
    description: "Join Finova Forge, the team building FinovaOS. See open roles and what it's like to work with us.",
  },
  "/contact": {
    title: "Contact Finova Forge",
    description: "Get in touch with Finova Forge for sales, support or partnership inquiries.",
  },
  "/support": {
    title: "Support — Finova Forge",
    description: "Get help with FinovaOS and Finova Forge products. Contact our support team.",
  },
  "/security": {
    title: "Security — Finova Forge",
    description: "How Finova Forge protects your data, and which security certifications we do and don't currently hold.",
  },
  "/privacy": {
    title: "Privacy Policy — Finova Forge",
    description: "Finova Forge's privacy policy: how we collect, use and protect your data.",
  },
  "/terms": {
    title: "Terms of Service — Finova Forge",
    description: "Finova Forge's terms of service for using FinovaOS and related products.",
  },
  "/status": {
    title: "System Status — Finova Forge",
    description: "Current uptime and status of FinovaOS and Finova Forge services.",
  },
};

export async function generateMetadata(): Promise<Metadata> {
  const pathname = (await headers()).get("x-pathname") ?? "/";
  const path = pathname.replace(/^\/forge(?=\/|$)/, "");
  const publicPath = path === "" || path === "/" || path === "/home" ? "" : path;
  const { title, description } = PAGE_META[publicPath] ?? { title: FORGE_TITLE, description: FORGE_DESCRIPTION };

  return {
  metadataBase: new URL(FORGE_URL),
  title,
  description,
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
    // Was hardcoded to FORGE_URL (the bare domain) on every page — the same
    // bug `alternates.canonical` had before forgeCanonical() was introduced
    // above, just never carried over to this field. 12 of the 13 /forge/*
    // pages disagreed with their own canonical because of it.
    url: forgeCanonical(pathname),
    siteName: "Finova Forge",
    title,
    description,
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
    title,
    description,
    images: [FORGE_OG_IMAGE],
  },
  alternates: {
    canonical: forgeCanonical(pathname),
  },
  };
}

// Organization and Person JSON-LD for finovaforge.com used to be declared
// again here — a second, independent copy of what app/layout.tsx also
// renders (that root layout now builds them pointed at finovaforge.com
// whenever the request arrives on that host; see isForgeHost there). Two
// Organization nodes on the same page is exactly the "duplicate/inconsistent
// JSON-LD entity" finding from the SEO audit, and the copies had drifted:
// this one gave Umer Sajjad's location as Lahore while the other said
// Faisalabad. Removed so there is one Organization and one Person node,
// sourced from one place.

export default function ForgeLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
