import type { Metadata } from "next";
import { headers } from "next/headers";
import Navbar from "./landing/components/navbar";
import Offer from "./landing/components/Offer";
import Footer from "./landing/components/Footer";
import ChatWidget from "./landing/components/ChatWidget";
import GeoPrecisionPrompt from "./landing/components/GeoPrecisionPrompt";
import MarketingThemeScope from "./landing/components/MarketingThemeScope";

const BASE = process.env.NEXT_PUBLIC_BASE_URL || "https://www.finovaos.app";

// A handful of pages already build their own, more specific BreadcrumbList
// (real blog post titles, page-specific @type) nested inside their own
// JSON-LD — skip those here so a page never carries two.
const OWN_BREADCRUMB = [/^\/$/, /^\/about$/, /^\/contact$/, /^\/blog\/[^/]+$/];

const ACRONYMS = new Set(["crm", "hr", "pos", "grn", "api", "faq", "aup", "dpa", "sla"]);

function humanize(segment: string): string {
  return decodeURIComponent(segment)
    .split("-")
    .map((word) => (ACRONYMS.has(word.toLowerCase()) ? word.toUpperCase() : word.charAt(0).toUpperCase() + word.slice(1)))
    .join(" ");
}

/**
 * Generic breadcrumb for every marketing page that doesn't build its own.
 * Was present on only 3 of ~45 pages (audit, Oct 2026) because the rest had
 * no breadcrumb at all, not because they didn't need one — this derives one
 * from the URL path instead of hand-writing it per page.
 */
function breadcrumbJsonLd(pathname: string): object | null {
  const path = pathname.split("?")[0].replace(/\/+$/, "");
  if (OWN_BREADCRUMB.some((re) => re.test(path))) return null;

  const segments = path.split("/").filter(Boolean);
  if (segments.length === 0) return null;

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: BASE },
      ...segments.map((seg, i) => ({
        "@type": "ListItem",
        position: i + 2,
        name: humanize(seg),
        item: `${BASE}/${segments.slice(0, i + 1).join("/")}`,
      })),
    ],
  };
}

export async function generateMetadata(): Promise<Metadata> {
  const pathname = (await headers()).get("x-pathname") ?? "/";

  return {
  alternates: { canonical: `${BASE}${pathname}` },
  metadataBase: new URL(BASE),
  title: {
    default: "FinovaOS — Cloud Accounting & ERP for SMEs and Enterprises",
    template: "%s | FinovaOS",
  },
  description:
    "FinovaOS — cloud ERP & accounting software purpose-built for trading, wholesale, manufacturing, distribution, restaurant, retail, import/export, construction, hospital, school, pharmacy, and service businesses in Pakistan, UAE & worldwide. FBR-ready invoicing, inventory, HR & payroll, bank reconciliation, CRM.",
  keywords: [
    // Brand
    "FinovaOS", "Finova Forge", "FinovaOS accounting",
    // Core platform
    "cloud accounting software", "cloud ERP", "AI accounting software",
    "business management software", "ERP software Pakistan", "online accounting Pakistan",
    // Features
    "invoicing software", "inventory management", "HR payroll software",
    "bank reconciliation", "CRM software", "multi-currency accounting",
    "FBR accounting software", "FBR compliant invoicing", "GST invoicing",
    // Trading & Wholesale
    "trading business software", "trading company accounting software",
    "wholesale accounting software", "wholesale ERP", "trading ERP Pakistan",
    // Distribution
    "distribution management software", "distribution ERP Pakistan",
    "route-based sales software", "van sales software",
    // Manufacturing
    "manufacturing ERP Pakistan", "manufacturing accounting software",
    "bill of materials software", "production order management", "job costing software",
    // Restaurant
    "restaurant management software", "restaurant billing software",
    "restaurant POS Pakistan", "food business software",
    // Retail
    "retail accounting software", "retail POS software", "retail management system",
    // Import / Export
    "import export software Pakistan", "clearing forwarding software",
    "trade management software", "shipment tracking software",
    // Construction
    "construction accounting software", "construction ERP Pakistan",
    // Hospital & Clinic
    "hospital management software Pakistan", "clinic billing software",
    "healthcare accounting software",
    // School
    "school management software Pakistan", "school fee management",
    // Pharmacy
    "pharmacy management software Pakistan", "pharmacy billing",
    // Transport
    "transport management software", "fleet management software",
    // Real Estate
    "real estate accounting software", "property management Pakistan",
    // Other industries
    "hotel management software", "NGO accounting software",
    "law firm billing software", "IT company accounting",
    "salon management software", "gym management software",
    "ecommerce accounting software", "agriculture accounting software",
    // Geo
    "accounting software Pakistan", "cloud accounting Pakistan",
    "business software Karachi", "business software Lahore",
    "accounting software UAE", "cloud accounting Dubai",
  ],
  authors: [{ name: "FinovaOS", url: BASE }],
  creator: "FinovaOS",
  publisher: "FinovaOS",
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "FinovaOS",
    images: [{ url: `${BASE}/icon.png`, width: 1200, height: 630, alt: "FinovaOS — Cloud Accounting & ERP for SMEs and Enterprises" }],
  },
  twitter: {
    card: "summary_large_image",
    site: "@finovaos",
    creator: "@finovaos",
    images: [`${BASE}/icon.png`],
  },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large" } },
  };
}

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const hdrs = await headers();
  const pathname = hdrs.get("x-pathname") ?? "/";
  const nonce = hdrs.get("x-nonce") || undefined;
  const breadcrumb = breadcrumbJsonLd(pathname);

  return (
    <MarketingThemeScope className="mkt-page flex min-h-dvh flex-col">
      {breadcrumb && (
        <script nonce={nonce} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      )}
      <style>{`
        @media(max-width:640px){
          .mkt-page [style*="130px 24px"]{padding-top:60px !important;padding-bottom:28px !important;}
          .mkt-page [style*="120px 24px"]{padding-top:56px !important;padding-bottom:28px !important;}
          .mkt-page [style*="110px 24px"]{padding-top:52px !important;padding-bottom:28px !important;}
          .mkt-page [style*="100px 24px"]{padding-top:52px !important;padding-bottom:28px !important;}
          .mkt-page [style*="90px 24px"]{padding-top:48px !important;padding-bottom:24px !important;}
          .mkt-page [style*="0 24px 120px"]{padding:0 16px 48px !important;}
          .mkt-page [style*="0 24px 100px"]{padding:0 16px 44px !important;}
          .mkt-page [style*="0 24px 90px"]{padding:0 16px 40px !important;}
          .mkt-page [style*="0 24px 80px"]{padding:0 16px 36px !important;}
          .mkt-page [style*="0 24px 60px"]{padding:0 16px 28px !important;}
          .mkt-page [style*="88px 24px"]{padding:48px 16px !important;}
          .mkt-page [style*="80px 24px"]{padding:44px 16px !important;}
          .mkt-page [style*="72px 24px"]{padding:40px 16px !important;}
          .mkt-page [style*="64px 24px"]{padding:36px 16px !important;}
          .mkt-page [style*="60px 24px"]{padding:32px 16px !important;}
        }
      `}</style>
      <Offer />
      <div className="sticky top-0 z-50">
        <Navbar />
      </div>
      {/* Overflow utilities removed — they made this a scroll container, which
          breaks `position: sticky` on the navbar above and nests a second
          scroller inside the page. See app/layout.tsx. */}
      <main className="grow">{children}</main>
      <Footer />
      <ChatWidget />
      <GeoPrecisionPrompt />
    </MarketingThemeScope>
  );
}
