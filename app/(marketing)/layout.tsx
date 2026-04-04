import type { Metadata } from "next";
import Navbar from "./landing/components/navbar";
import Offer from "./landing/components/Offer";
import Footer from "./landing/components/Footer";
import ChatWidget from "./landing/components/ChatWidget";
import { Suspense } from "react";
import VisitorTracker from "./landing/components/VisitorTracker";

const BASE = process.env.NEXT_PUBLIC_BASE_URL || "https://finovaos.app";

export const metadata: Metadata = {
  metadataBase: new URL(BASE),
  title: {
    default: "Finova — Cloud Accounting & Business Management for SMEs",
    template: "%s | Finova",
  },
  description:
    "Cloud accounting software for modern SMEs. Invoicing, inventory, HR & payroll, bank reconciliation, CRM — all in one platform. Trusted by 12,000+ businesses in 40+ countries.",
  keywords: [
    "accounting software", "cloud accounting", "invoicing software", "inventory management",
    "HR payroll", "bank reconciliation", "CRM software", "SME accounting", "financial management",
    "business software", "online accounting", "Finova",
  ],
  authors: [{ name: "Finova", url: BASE }],
  creator: "Finova",
  publisher: "Finova",
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Finova",
    images: [{ url: `${BASE}/icon.png`, width: 1200, height: 630, alt: "Finova — Cloud Accounting for SMEs" }],
  },
  twitter: {
    card: "summary_large_image",
    site: "@finova_io",
    creator: "@finova_io",
    images: [`${BASE}/icon.png`],
  },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large" } },
};

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-[#060919]">
      <Offer />
      <div className="sticky top-0 z-50">
        <Navbar />
      </div>
      <main className="grow overflow-x-hidden">{children}</main>
      <Footer />
      <ChatWidget />
      <Suspense fallback={null}><VisitorTracker /></Suspense>
    </div>
  );
}
