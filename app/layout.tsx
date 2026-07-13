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
const CLARITY_PROJECT_ID = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID || undefined;
const BRAND_ICON_PATH = "/icon.png";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "FinovaOS — AI Cloud Accounting Software for SMEs",
    template: "%s | FinovaOS",
  },
  description:
    "AI-powered cloud accounting for SMEs. Invoicing, inventory, HR & payroll, bank reconciliation, CRM — all in one. Trusted by 500+ businesses in Pakistan & UAE.",
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
  authors: [{ name: "Finova Forge", url: "https://finovaforge.com" }],
  creator: "Finova Forge",
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
  description: "Cloud accounting software for modern SMEs. Invoicing, inventory, HR & payroll, bank reconciliation, CRM.",
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
  ],
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
  description: "Finova Forge is the company behind FinovaOS, a cloud accounting and business management platform for modern SMEs.",
  foundingDate: "2023",
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
        <script nonce={nonce} suppressHydrationWarning async src="https://www.googletagmanager.com/gtag/js?id=G-PY9D7NW061" />
        <script nonce={nonce} suppressHydrationWarning dangerouslySetInnerHTML={{ __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-PY9D7NW061');` }} />
        {CLARITY_PROJECT_ID && (
          <script
            nonce={nonce}
            suppressHydrationWarning
            dangerouslySetInnerHTML={{
              __html: `(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","${CLARITY_PROJECT_ID}");`,
            }}
          />
        )}
        <script nonce={nonce} suppressHydrationWarning type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareApplicationJsonLd) }} />
        <script nonce={nonce} suppressHydrationWarning type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }} />
        <script nonce={nonce} suppressHydrationWarning type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }} />
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
