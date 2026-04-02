import type { Metadata, Viewport } from "next";
import { Toaster } from "react-hot-toast";
import "./globals.css";

import CookieBanner from "./(marketing)/landing/components/CookieBanner";
import { ThemeProvider } from "@/components/theme-provider";
import VisitorTracker from "@/components/VisitorTracker";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://finovaos.app";
const GOOGLE_SITE_VERIFICATION =
  process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined;

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "Finova - Global Accounting & Business Management Platform",
    template: "%s | Finova",
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
    "Finova",
    "business management software",
    "online accounting",
  ],
  authors: [{ name: "Finova", url: BASE_URL }],
  creator: "Finova",
  publisher: "Finova",
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
    siteName: "Finova",
    title: "Finova - Global Accounting & Business Management Platform",
    description:
      "Cloud accounting software for modern SMEs. Invoicing, inventory, HR & payroll, bank reconciliation, CRM - all in one platform.",
    images: [
      {
        url: `${BASE_URL}/icon.png`,
        alt: "Finova - Global Accounting Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@finova_io",
    creator: "@finova_io",
    title: "Finova - Global Accounting & Business Management Platform",
    description:
      "Cloud accounting software for modern SMEs. Used by 12,000+ businesses in 40+ countries.",
    images: [`${BASE_URL}/icon.png`],
  },
  applicationName: "Finova",
  generator: "Next.js",
  referrer: "origin-when-cross-origin",
  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
    shortcut: "/icon.png",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Finova",
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
  name: "Finova",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description: "Cloud accounting software for modern SMEs. Invoicing, inventory, HR & payroll, bank reconciliation, CRM.",
  url: BASE_URL,
  screenshot: `${BASE_URL}/icon.png`,
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
  name: "Finova",
  url: BASE_URL,
  logo: {
    "@type": "ImageObject",
    url: `${BASE_URL}/icon.png`,
    width: 512,
    height: 512,
  },
  description: "Cloud accounting and business management software for modern SMEs.",
  foundingDate: "2023",
  numberOfEmployees: { "@type": "QuantitativeValue", value: 120 },
  contactPoint: [
    {
      "@type": "ContactPoint",
      telephone: "+1-800-000-0000",
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
  name: "Finova",
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
          <Toaster position="top-center" />
          <div className="flex min-h-screen flex-col">
            <main className="flex-grow">{children}</main>
          </div>
          <CookieBanner />
        </ThemeProvider>
      </body>
    </html>
  );
}
