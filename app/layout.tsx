import type { Metadata, Viewport } from "next";
import { Toaster } from "react-hot-toast";
import "./globals.css";

import CookieBanner from "./(marketing)/landing/components/CookieBanner";
import { ThemeProvider } from "@/components/theme-provider";
import VisitorTracker from "@/components/VisitorTracker";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://finovaos.app";
const GOOGLE_SITE_VERIFICATION =
  process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined;
const BRAND_ICON_PATH = "/icon1-tight.png";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "FinovaOS - Global Accounting & Business Management Platform",
    template: "%s | FinovaOS",
  },
  description:
    "Cloud accounting software for modern SMEs. Invoicing, inventory, HR & payroll, bank reconciliation, CRM - all in one platform. Used by 12,000+ businesses in 40+ countries.",
  keywords: [
    "accounting software",
    "cloud accounting",
    "invoicing software",
    "inventory management",
    "HR payroll software",
    "bank reconciliation",
    "CRM",
    "SME accounting",
    "global accounting software",
    "multi-currency accounting",
    "UAE accounting",
    "UK accounting",
    "international business software",
    "FinovaOS",
    "business management software",
    "online accounting",
  ],
  authors: [{ name: "FinovaOS", url: BASE_URL }],
  creator: "FinovaOS",
  publisher: "FinovaOS",
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
      "Cloud accounting software for modern SMEs. Invoicing, inventory, HR & payroll, bank reconciliation, CRM - all in one platform.",
    images: [
      {
        url: `${BASE_URL}${BRAND_ICON_PATH}`,
        alt: "FinovaOS - Global Accounting Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@finova_io",
    creator: "@finova_io",
    title: "FinovaOS - Global Accounting & Business Management Platform",
    description:
      "Cloud accounting software for modern SMEs. Used by 12,000+ businesses in 40+ countries.",
    images: [`${BASE_URL}${BRAND_ICON_PATH}`],
  },
  applicationName: "FinovaOS",
  generator: "Next.js",
  referrer: "origin-when-cross-origin",
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon1-tight-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon1-tight-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icon1-tight-192.png", sizes: "192x192", type: "image/png" }],
    shortcut: "/favicon-32x32.png",
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
  name: "FinovaOS",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description: "Cloud accounting software for modern SMEs. Invoicing, inventory, HR & payroll, bank reconciliation, CRM.",
  url: BASE_URL,
  screenshot: `${BASE_URL}${BRAND_ICON_PATH}`,
  offers: {
    "@type": "AggregateOffer",
    lowPrice: "49",
    highPrice: "249",
    priceCurrency: "USD",
    offerCount: "3",
  },
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.8",
    reviewCount: "2400",
    bestRating: "5",
    worstRating: "1",
  },
  featureList: [
    "Sales & Purchase Invoicing",
    "General Ledger & Trial Balance",
    "Inventory Management",
    "HR & Payroll",
    "Bank Reconciliation",
    "CRM",
    "Multi-Currency",
    "Financial Reports",
  ],
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "FinovaOS",
  url: BASE_URL,
  logo: {
    "@type": "ImageObject",
    url: `${BASE_URL}${BRAND_ICON_PATH}`,
    width: 512,
    height: 512,
  },
  description: "Cloud accounting and business management software for modern SMEs.",
  foundingDate: "2023",
  numberOfEmployees: { "@type": "QuantitativeValue", value: 120 },
  contactPoint: [
    {
      "@type": "ContactPoint",
      telephone: "+92-304-7653693",
      contactType: "customer service",
      email: "finovaos.app@gmail.com",
      availableLanguage: ["English", "Arabic", "Urdu"],
    },
    {
      "@type": "ContactPoint",
      contactType: "sales",
      email: "finovaos.app@gmail.com",
    },
  ],
  sameAs: [
    "https://twitter.com/finova_io",
    "https://linkedin.com/company/finova",
    "https://facebook.com/finova",
    "https://instagram.com/finova",
  ],
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "FinovaOS",
  url: BASE_URL,
  description: "Cloud accounting software for modern SMEs.",
  potentialAction: {
    "@type": "SearchAction",
    target: { "@type": "EntryPoint", urlTemplate: `${BASE_URL}/search?q={search_term_string}` },
    "query-input": "required name=search_term_string",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareApplicationJsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }} />
      </head>
      <body
        className="app-root"
        style={{ background: "#060919" }}
        suppressHydrationWarning
      >
        <VisitorTracker />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3500,
              style: {
                background: "#1a1f3a",
                color: "#e8ecf5",
                border: "1px solid rgba(99,102,241,0.3)",
                borderRadius: "10px",
                fontFamily: "'Outfit','Inter',sans-serif",
                fontSize: "13px",
                fontWeight: 600,
                boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
              },
              success: { iconTheme: { primary: "#34d399", secondary: "#1a1f3a" } },
              error:   { iconTheme: { primary: "#f87171", secondary: "#1a1f3a" } },
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
