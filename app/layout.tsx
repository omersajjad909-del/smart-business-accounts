import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Toaster } from "react-hot-toast";
import "./globals.css";

/**
 * Every weight of Outfit and Lora the marketing pages use, requested once.
 *
 * 63 components each carried their own
 * `<style>{`@import url('https://fonts.googleapis.com/...')`}</style>`. An
 * `@import` inside an inline <style> is the slowest font path there is: the
 * preload scanner cannot see it, so the browser has to parse the HTML, parse
 * that CSS, fetch the stylesheet, and only then fetch the font files. The home
 * page fired a dozen of them, and when the fonts finally landed the whole page
 * reflowed — which is what looked like the page loading a second time.
 *
 * One <link> in <head>, preceded by preconnects, is discovered immediately and
 * shared by every component. Kept as a plain stylesheet rather than next/font
 * on purpose: those 63 components hard-code `fontFamily: "'Outfit',sans-serif"`
 * and next/font only exposes a hashed family name, which would silently drop
 * every one of them back to the system sans.
 */
const GOOGLE_FONTS_HREF =
  "https://fonts.googleapis.com/css2" +
  "?family=Outfit:wght@300;400;500;600;700;800;900" +
  "&family=Lora:ital,wght@0,400;0,600;0,700;1,600;1,700" +
  // Blog pages set their body copy in DM Sans.
  "&family=DM+Sans:wght@400;500;600;700;800" +
  "&display=swap";

import CookieBanner from "./(marketing)/landing/components/CookieBanner";
import AnalyticsGate from "./(marketing)/landing/components/AnalyticsGate";
import { ThemeProvider } from "@/components/theme-provider";
import VisitorTracker from "@/components/VisitorTracker";
import ClientRegionSignal from "@/components/ClientRegionSignal";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://www.finovaos.app";
const GOOGLE_SITE_VERIFICATION =
  process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined;
const BRAND_ICON_PATH = "/icon.png";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "FinovaOS — AI Cloud Accounting Software for SMEs",
    template: "%s | FinovaOS",
  },
  description:
    "FinovaOS — cloud ERP & accounting software purpose-built for trading, wholesale, manufacturing, distribution, restaurant, retail, import/export, construction, and service businesses. Invoicing, inventory, HR, payroll, CRM, bank reconciliation — all in one platform.",
  keywords: [
    // Brand
    "FinovaOS", "Finova Forge", "FinovaOS accounting",
    // Core platform
    "cloud accounting software", "cloud ERP", "AI accounting software", "AI ERP",
    "business management software", "online accounting", "smart accounting software",
    "AI business intelligence", "business health score",
    // Features
    "invoicing software", "inventory management", "HR payroll software",
    "bank reconciliation", "CRM software", "multi-currency accounting",
    "financial reports", "purchase order software", "goods receipt note",
    "expense management", "payroll software", "attendance management",
    // Industries — Trading & Wholesale
    "trading business software", "trading company accounting software",
    "wholesale accounting software", "wholesale business ERP",
    "trading ERP Pakistan", "wholesale management system",
    // Industries — Distribution
    "distribution management software", "distribution ERP",
    "route-based sales software", "van sales software", "multi-warehouse software",
    // Industries — Manufacturing
    "manufacturing ERP", "manufacturing accounting software",
    "bill of materials software", "production order management",
    "job costing software", "raw material management",
    // Industries — Restaurant
    "restaurant management software", "restaurant billing software",
    "restaurant POS software", "food & beverage ERP",
    // Industries — Retail
    "retail accounting software", "retail POS software",
    "retail management system", "retail inventory software",
    // Industries — Import / Export
    "import export software", "trade management software",
    "clearing forwarding software", "shipment tracking software",
    "LC TT management", "commercial invoice software",
    // Industries — Construction
    "construction accounting software", "construction ERP",
    "job costing construction", "project billing software",
    // Industries — Hotel
    "hotel management software", "hotel billing software", "hospitality ERP",
    // Industries — Hospital & Clinic
    "hospital management software", "clinic billing software",
    "healthcare accounting software", "hospital ERP",
    // Industries — School & Education
    "school management software", "school fee management",
    "education ERP", "student billing software",
    // Industries — Pharmacy
    "pharmacy management software", "pharmacy billing software", "pharmacy ERP",
    // Industries — Transport
    "transport management software", "fleet management software", "transport billing",
    // Industries — Real Estate
    "real estate accounting software", "property management software",
    // Industries — Service
    "service business accounting", "service company invoicing",
    // Industries — NGO
    "NGO accounting software", "non-profit accounting software",
    // Industries — IT & Law
    "IT company accounting software", "law firm billing software",
    // Industries — Salon, Gym, E-commerce, Agriculture
    "salon management software", "gym management software",
    "ecommerce accounting software", "agriculture accounting software",
    // Geo — Pakistan
    "accounting software Pakistan", "cloud accounting Pakistan",
    "FBR accounting software", "ERP software Pakistan",
    "business software Karachi", "business software Lahore",
    // Geo — UAE/Gulf
    "accounting software UAE", "cloud accounting Dubai", "SME software Gulf",
  ],
  authors: [{ name: "Umer Sajjad", url: "https://www.finovaos.app/forge/about" }, { name: "Finova Forge", url: "https://finovaforge.com" }],
  creator: "Umer Sajjad",
  publisher: "Finova Forge",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: BASE_URL,
    siteName: "FinovaOS",
    title: "FinovaOS - Global Accounting & Business Management Platform",
    description:
      "AI cloud accounting for SMEs. Invoicing, inventory, HR & payroll, bank reconciliation, CRM in one platform.",
  },
  twitter: {
    card: "summary_large_image",
    title: "FinovaOS - Global Accounting & Business Management Platform",
    description:
      "AI-powered cloud accounting for SMEs in Pakistan, the UAE & beyond.",
  },
  applicationName: "FinovaOS",
  generator: "Next.js",
  referrer: "origin-when-cross-origin",
  icons: {
    icon: [
      { url: "/icon.png", sizes: "any", type: "image/png" },
    ],
    apple: [{ url: "/icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: "/icon.png",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "FinovaOS",
  },
  verification: {
    google: GOOGLE_SITE_VERIFICATION,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#080c1e" },
    { media: "(prefers-color-scheme: light)", color: "#4f46e5" },
  ],
};

const softwareApplicationJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "@id": `${BASE_URL}/#software`,
  name: "FinovaOS",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description: "FinovaOS — cloud ERP & accounting software purpose-built for trading, wholesale, manufacturing, distribution, restaurant, retail, import/export, construction, hospital, school, pharmacy, transport, real estate, and service businesses.",
  url: BASE_URL,
  screenshot: `${BASE_URL}${BRAND_ICON_PATH}`,
  sameAs: ["https://www.wikidata.org/wiki/Q140702000"],
  brand: {
    "@type": "Brand",
    name: "FinovaOS",
  },
  provider: {
    "@id": `${BASE_URL}/#organization`,
  },
  publisher: {
    "@id": `${BASE_URL}/#organization`,
  },
  offers: {
    "@type": "AggregateOffer",
    lowPrice: "49",
    highPrice: "249",
    priceCurrency: "USD",
    offerCount: "3",
  },
  featureList: [
    "AI Business Health Score",
    "Ask AI — Natural Language Finance Queries",
    "Sales & Purchase Invoicing",
    "General Ledger & Trial Balance",
    "Inventory Management",
    "HR & Payroll",
    "Bank Reconciliation",
    "CRM",
    "Multi-Currency",
    "Financial Reports",
    "Expense Auto-Categorization",
    "Duplicate Transaction Detection",
    "Trading & Wholesale Management",
    "Manufacturing — Bill of Materials & Production Orders",
    "Distribution — Route-based Sales & Van Stock",
    "Restaurant — POS & Food Billing",
    "Retail — POS & Branch Stock Control",
    "Import/Export — Commercial Invoices & Shipment Tracking",
    "Construction — Job Costing & Project Billing",
    "Hospital & Clinic Billing",
    "School Fee Management",
    "Pharmacy Management",
    "Transport & Fleet Management",
    "Real Estate Accounting",
    "Clearing & Forwarding Management",
  ],
};

const founderJsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  "@id": `${BASE_URL}/#founder`,
  name: "Umer Sajjad",
  jobTitle: "Founder & CEO",
  worksFor: { "@id": `${BASE_URL}/#organization` },
  url: `${BASE_URL}/forge/about`,
  sameAs: [
    "https://www.linkedin.com/in/umer-sajjad-657936417",
    "https://www.wikidata.org/wiki/Q140701676",
    `${BASE_URL}/forge/about`,
    `${BASE_URL}/about`,
  ],
  description: "Umer Sajjad is the Founder and CEO of Finova Forge — a PSEB Registered IT Exporter based in Lahore, Pakistan — and the creator of FinovaOS, an AI-powered cloud ERP and accounting platform serving 22+ industries with 50+ modules.",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Faisalabad",
    addressCountry: "PK",
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${BASE_URL}/#organization`,
  name: "Finova Forge",
  alternateName: ["FinovaOS", "Finova Forge Pakistan"],
  url: "https://finovaforge.com",
  logo: {
    "@type": "ImageObject",
    url: `${BASE_URL}${BRAND_ICON_PATH}`,
    width: 512,
    height: 512,
  },
  description: "Finova Forge is a PSEB Registered IT Exporter based in Faisalabad, Pakistan — founded in 2025 by Umer Sajjad. We build FinovaOS, a cloud ERP & accounting platform purpose-built for 22+ industries including trading, manufacturing, restaurant, retail, import/export, construction, hospital, school, pharmacy, and transport businesses worldwide.",
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
    "@id": `${BASE_URL}/#founder`,
    "@type": "Person",
    name: "Umer Sajjad",
  },
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "customer service",
    email: "hello@finovaos.app",
    url: `${BASE_URL}/contact`,
    availableLanguage: ["English", "Urdu"],
  },
  sameAs: [
    "https://finovaforge.com",
    "https://www.finovaos.app",
    "https://www.linkedin.com/in/umer-sajjad-657936417",
    "https://www.wikidata.org/wiki/Q140701786",
  ],
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "FinovaOS",
  url: BASE_URL,
  description: "Cloud accounting software for modern SMEs.",
  publisher: { "@id": `${BASE_URL}/#organization` },
  potentialAction: {
    "@type": "SearchAction",
    target: { "@type": "EntryPoint", urlTemplate: `${BASE_URL}/search?q={search_term_string}` },
    "query-input": "required name=search_term_string",
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const nonce = (await headers()).get("x-nonce") || undefined;
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href={GOOGLE_FONTS_HREF} />
        {/* Guard against third-party scripts (Clarity, etc.) probing window.webkit.messageHandlers in non-WKWebView contexts */}
        <script nonce={nonce} suppressHydrationWarning dangerouslySetInnerHTML={{ __html: `if(typeof window!=="undefined"&&!window.webkit){window.webkit={messageHandlers:{}}}` }} />
        {/* GA4 — loaded early but defaults to consent denied until AnalyticsLoader updates it */}
        <script nonce={nonce} suppressHydrationWarning async src="https://www.googletagmanager.com/gtag/js?id=G-PY9D7NW061" />
        <script nonce={nonce} suppressHydrationWarning dangerouslySetInnerHTML={{ __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('consent','default',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',wait_for_update:500});gtag('js',new Date());gtag('config','G-PY9D7NW061',{anonymize_ip:true});` }} />
        {/* Clarity is injected by AnalyticsLoader only after analytics consent is given */}
        <script nonce={nonce} suppressHydrationWarning type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareApplicationJsonLd) }} />
        <script nonce={nonce} suppressHydrationWarning type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }} />
        <script nonce={nonce} suppressHydrationWarning type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(founderJsonLd) }} />
        <script nonce={nonce} suppressHydrationWarning type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }} />
      </head>
      <body className="app-root" suppressHydrationWarning>
        <VisitorTracker />
        <ClientRegionSignal />
        {/* ScrollRestorer removed. It hunted for any fixed/sticky element
            covering the viewport and set `pointer-events: none` on it — which
            caught the dashboard sidebar (position:fixed, top:0, bottom:0) and
            left it dead: unscrollable and unclickable. It also re-scanned every
            element in the document on every DOM mutation. It was a workaround
            for scrolling bugs whose real causes are now fixed: overflow on
            body/<main> and the dashboard shell's use of vh. */}
        <AnalyticsGate />
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3500,
              style: {
                background: "var(--surface)",
                color: "var(--text-primary)",
                border: "1px solid var(--border)",
                borderRadius: "10px",
                fontFamily: "'Outfit','Inter',sans-serif",
                fontSize: "13px",
                fontWeight: 600,
                boxShadow: "0 16px 40px rgba(15,23,42,0.12)",
              },
              success: { iconTheme: { primary: "#34d399", secondary: "var(--surface)" } },
              error:   { iconTheme: { primary: "#f87171", secondary: "var(--surface)" } },
            }}
          />
          <div className="app-page-shell flex min-h-dvh flex-col">
            {/* No overflow utilities here. `overflow-y-auto` turns this <main>
                into a scroll container, and every page renders inside it — so
                the sticky navbar wrapper (app/page.tsx, the marketing layout)
                had a scrolling ancestor and stopped sticking. Vertical scroll
                belongs to the page; sideways overflow is clipped once by
                `html { overflow-x: clip }` in globals.css. */}
            <main className="grow">{children}</main>
          </div>
          <CookieBanner />
        </ThemeProvider>
      </body>
    </html>
  );
}
