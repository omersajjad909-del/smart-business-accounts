import type { Metadata } from "next";

const BASE = process.env.NEXT_PUBLIC_BASE_URL || "https://finovaos.app";

export const metadata: Metadata = {
  title: "FinovaOS — Cloud Accounting & Business Management for SMEs",
  description:
    "Cloud accounting software for modern SMEs. Invoicing, inventory, HR & payroll, bank reconciliation, CRM — all in one platform. Purpose-built for trading, wholesale, and distribution businesses.",
  keywords: [
    "accounting software", "cloud accounting", "invoicing software", "inventory management",
    "HR payroll", "bank reconciliation", "CRM software", "SME accounting",
    "financial management", "business software", "online accounting", "FinovaOS",
  ],
  openGraph: {
    title: "FinovaOS — Cloud Accounting & Business Management",
    description: "Cloud financial management for SMEs — invoicing, inventory, payroll, CRM, and more in one platform.",
    url: `${BASE}/`,
    siteName: "FinovaOS",
    images: [{ url: `${BASE}/icon.png`, width: 1200, height: 630, alt: "FinovaOS" }],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "FinovaOS — Cloud Accounting for SMEs",
    description: "Cloud financial management for SMEs — invoicing, inventory, payroll, CRM, and more.",
    images: [`${BASE}/icon.png`],
  },
  alternates: { canonical: `${BASE}/` },
};

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
