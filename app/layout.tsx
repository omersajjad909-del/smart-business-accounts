import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Toaster } from "react-hot-toast";
import "./globals.css";

import CookieBanner from "./(marketing)/landing/components/CookieBanner";
import { ThemeProvider } from "@/components/theme-provider";
import VisitorTracker from "@/components/VisitorTracker";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://www.finovaos.app";
const GOOGLE_SITE_VERIFICATION =
  process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined;
const BRAND_ICON_PATH = "/icon1.png";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "FinovaOS - Global Accounting & Business Management Platform",
    template: "%s | FinovaOS",
  },
  description:
    "AI-powered cloud accounting software for modern SMEs. Invoicing, inventory, HR & payroll, bank reconciliation, CRM — all in one platform. Trusted by 500+ businesses in Pakistan, UAE, and beyond.",
  keywords: [
    "accounting software",
    "cloud accounting",
    "AI accounting software",
    "AI business intelligence",
    "invoicing software",
    "inventory management",
    "HR payroll software",
    "bank reconciliation",
    "CRM",
    "SME accounting",
    "global accounting software",
    "multi-currency accounting",
    "accounting software Pakistan",
    "UAE accounting software",
    "ERP software",
    "FinovaOS",
    "business management software",
    "online accounting",
    "AI ERP",
    "smart accounting software",
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
      "AI-powered cloud accounting for SMEs. Trusted by 500+ businesses in Pakistan, UAE & beyond.",
    images: [`${BASE_URL}${BRAND_ICON_PATH}`],
  },
  applicationName: "FinovaOS",
  generator: "Next.js",
  referrer: "origin-when-cross-origin",
  icons: {
    icon: [
      { url: "/icon1.png", sizes: "any", type: "image/png" },
    ],
    apple: [{ url: "/icon1.png", sizes: "180x180", type: "image/png" }],
    shortcut: "/icon1.png",
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

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const nonce = (await headers()).get("x-nonce") || undefined;
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script nonce={nonce} async src="https://www.googletagmanager.com/gtag/js?id=G-PY9D7NW061" />
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-PY9D7NW061');` }} />
        <script nonce={nonce} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareApplicationJsonLd) }} />
        <script nonce={nonce} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }} />
        <script nonce={nonce} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }} />
      </head>
      <body className="app-root" suppressHydrationWarning>
        <VisitorTracker />
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
