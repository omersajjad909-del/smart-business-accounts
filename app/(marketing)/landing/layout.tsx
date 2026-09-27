import type { Metadata } from "next";

const BASE = process.env.NEXT_PUBLIC_BASE_URL || "https://www.finovaos.app";

export const metadata: Metadata = {
  title: "FinovaOS — Cloud Accounting & ERP for SMEs and Enterprises",
  description:
    "Cloud accounting software for Pakistan & UAE businesses. FBR-ready invoicing, inventory management, HR & payroll, bank reconciliation, CRM — all in one platform, built for SMEs and enterprises in Karachi, Lahore, and Dubai.",
  keywords: [
    // Pakistan-specific
    "accounting software Pakistan", "cloud accounting Pakistan", "FBR accounting software",
    "business software Pakistan", "invoicing software Pakistan", "SME accounting Pakistan",
    "Karachi accounting software", "Lahore business software", "online accounting Pakistan",
    "FBR compliant invoicing", "Pakistan SME software", "double entry accounting Pakistan",
    // UAE/Gulf
    "accounting software UAE", "cloud accounting Dubai", "SME software Dubai",
    "UAE VAT accounting software", "Gulf accounting software",
    // Enterprise
    "enterprise ERP Pakistan", "enterprise accounting software", "multi-branch ERP software",
    "ERP for large businesses", "enterprise ERP UAE",
    // Features
    "invoicing software", "inventory management software", "HR payroll software",
    "bank reconciliation software", "CRM software", "financial management software",
    "GST invoicing", "payroll management",
    // Brand
    "FinovaOS", "FinovaOS accounting",
  ],
  openGraph: {
    title: "FinovaOS — Cloud Accounting & ERP for SMEs and Enterprises",
    description: "FBR-ready invoicing, inventory, HR & payroll, bank reconciliation, and CRM — all in one cloud platform for Pakistan & UAE SMEs and enterprises.",
    url: `${BASE}/`,
    siteName: "FinovaOS",
    images: [{ url: `${BASE}/icon.png`, width: 1200, height: 630, alt: "FinovaOS — Cloud Accounting & ERP for SMEs and Enterprises" }],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "FinovaOS — Cloud Accounting & ERP for SMEs and Enterprises",
    description: "FBR-ready invoicing, inventory, HR & payroll, bank reconciliation, CRM — all in one platform built for SMEs and enterprises.",
    images: [`${BASE}/icon.png`],
  },
  alternates: { canonical: `${BASE}/` },
};

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
