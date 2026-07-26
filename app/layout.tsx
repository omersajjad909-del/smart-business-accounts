import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Toaster } from "react-hot-toast";
import "./globals.css";

import CookieBanner from "./(marketing)/landing/components/CookieBanner";
import AnalyticsGate from "./(marketing)/landing/components/AnalyticsGate";
import { ThemeProvider } from "@/components/theme-provider";
import VisitorTracker from "@/components/VisitorTracker";

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
      "AI-powered cloud accounting for SMEs. Trusted by 500+ businesses in Pakistan, UAE & beyond.",
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
    "https://linkedin.com/company/finovaforge",
    `${BASE_URL}/forge/about`,
  ],
  description: "Umer Sajjad is the Founder and CEO of Finova Forge and FinovaOS — an AI-powered cloud accounting and business management platform for SMEs.",
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${BASE_URL}/#organization`,
  name: "Finova Forge",
  alternateName: "FinovaOS",
  url: "https://finovaforge.com",
  logo: {
    "@type": "ImageObject",
    url: `${BASE_URL}${BRAND_ICON_PATH}`,
    width: 512,
    height: 512,
  },
  description: "Finova Forge is the software company behind FinovaOS — a cloud ERP & accounting platform purpose-built for trading, wholesale, manufacturing, distribution, restaurant, retail, import/export, construction, hospital, school, pharmacy, transport, real estate, and service businesses worldwide.",
  foundingDate: "2024",
  foundingLocation: "Pakistan",
  founder: {
    "@id": `${BASE_URL}/#founder`,
    "@type": "Person",
    name: "Umer Sajjad",
  },
  numberOfEmployees: { "@type": "QuantitativeValue", value: 120 },
  contactPoint: [
    {
      "@type": "ContactPoint",
      telephone: "+92-304-7653693",
      contactType: "customer service",
      email: "hello@finovaos.app",
      url: `${BASE_URL}/contact`,
      availableLanguage: ["English", "Arabic", "Urdu"],
    },
    {
      "@type": "ContactPoint",
      contactType: "legal",
      email: "legal@finovaos.app",
      url: `${BASE_URL}/legal/privacy`,
    },
  ],
  sameAs: [
    "https://finovaforge.com",
    "https://www.finovaos.app",
    "https://linkedin.com/company/finovaforge",
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
          <div className="flex min-h-screen flex-col">
            <main className="flex-grow">{children}</main>
          </div>
          <CookieBanner />
        </ThemeProvider>
      </body>
    </html>
  );
}
