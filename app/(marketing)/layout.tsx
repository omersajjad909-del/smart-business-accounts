import type { Metadata } from "next";
import { headers } from "next/headers";
import Navbar from "./landing/components/navbar";
import Offer from "./landing/components/Offer";
import Footer from "./landing/components/Footer";
import ChatWidget from "./landing/components/ChatWidget";
import GeoPrecisionPrompt from "./landing/components/GeoPrecisionPrompt";

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
    <div className="mkt-page flex min-h-dvh flex-col bg-[#060919]">
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
      <main className="grow overflow-x-hidden overflow-y-auto">{children}</main>
      <Footer />
      <ChatWidget />
      <GeoPrecisionPrompt />
    </div>
  );
}
