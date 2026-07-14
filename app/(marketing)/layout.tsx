import type { Metadata } from "next";
import { headers } from "next/headers";
import Navbar from "./landing/components/navbar";
import Offer from "./landing/components/Offer";
import Footer from "./landing/components/Footer";
import ChatWidget from "./landing/components/ChatWidget";
import CookieBanner from "./landing/components/CookieBanner";
import GeoPrecisionPrompt from "./landing/components/GeoPrecisionPrompt";
import { Suspense } from "react";
import VisitorTracker from "./landing/components/VisitorTracker";

const BASE = process.env.NEXT_PUBLIC_BASE_URL || "https://www.finovaos.app";

export async function generateMetadata(): Promise<Metadata> {
  const pathname = (await headers()).get("x-pathname") ?? "/";

  return {
  alternates: { canonical: `${BASE}${pathname}` },
  metadataBase: new URL(BASE),
  title: {
    default: "FinovaOS — Cloud Accounting Software for Pakistan & Gulf SMEs",
    template: "%s | FinovaOS",
  },
  description:
    "Best cloud accounting software for Pakistan & UAE businesses. FBR-ready invoicing, inventory, HR & payroll, bank reconciliation, CRM — all in one platform. Trusted by 500+ SMEs in Karachi, Lahore, Dubai.",
  keywords: [
    // Pakistan-specific
    "accounting software Pakistan", "cloud accounting Pakistan", "FBR accounting software",
    "business software Pakistan", "invoicing software Pakistan", "SME accounting Pakistan",
    "Karachi accounting software", "Lahore business software", "online accounting Pakistan",
    // UAE/Gulf
    "accounting software UAE", "cloud accounting Dubai", "SME software Dubai",
    // AI
    "AI accounting software", "AI business intelligence", "smart accounting software",
    "AI ERP Pakistan", "business health score", "AI financial insights",
    // Features
    "invoicing software", "inventory management", "HR payroll software", "bank reconciliation",
    "CRM software", "financial management", "GST invoicing", "FBR compliant",
    "ERP software Pakistan", "cloud ERP",
    // Brand
    "FinovaOS", "FinovaOS accounting",
  ],
  authors: [{ name: "FinovaOS", url: BASE }],
  creator: "FinovaOS",
  publisher: "FinovaOS",
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "FinovaOS",
    images: [{ url: `${BASE}/icon.png`, width: 1200, height: 630, alt: "FinovaOS — Cloud Accounting for SMEs" }],
  },
  twitter: {
    card: "summary_large_image",
    site: "@finova_io",
    creator: "@finova_io",
    images: [`${BASE}/icon.png`],
  },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large" } },
  };
}

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mkt-page flex min-h-screen flex-col bg-[#060919]">
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
      <main className="grow overflow-x-hidden">{children}</main>
      <Footer />
      <ChatWidget />
      <CookieBanner />
      <GeoPrecisionPrompt />
      <Suspense fallback={null}><VisitorTracker /></Suspense>
    </div>
  );
}
