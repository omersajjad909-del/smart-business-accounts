import type { Metadata } from "next";

const BASE = process.env.NEXT_PUBLIC_BASE_URL || "https://finovaos.app";

export const metadata: Metadata = {
  title: "All Features — Accounting, Inventory, HR, CRM & More",
  description:
    "Explore Finova's complete feature set: general ledger, sales & purchase invoices, inventory management, HR & payroll, CRM, bank reconciliation, audit logs, and 50+ tools built for modern SMEs.",
  keywords: [
    "accounting software features",
    "invoicing software",
    "inventory management system",
    "HR payroll software",
    "CRM software",
    "bank reconciliation tool",
    "financial reporting software",
    "cloud accounting features",
    "multi-currency accounting",
    "expense management",
  ],
  openGraph: {
    title: "All Features — Accounting, Inventory, HR, CRM & More | Finova",
    description:
      "50+ tools for modern businesses: invoicing, inventory, payroll, CRM, and real-time financial reporting — all in one cloud platform.",
    url: `${BASE}/features`,
    siteName: "Finova",
    images: [{ url: `${BASE}/icon.png`, width: 1200, height: 630, alt: "Finova Features" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "All Features | Finova",
    description: "50+ tools: invoicing, inventory, payroll, CRM, bank reconciliation, and more.",
    images: [`${BASE}/icon.png`],
  },
  alternates: { canonical: `${BASE}/features` },
};

export default function FeaturesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
