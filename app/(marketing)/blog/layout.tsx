import type { Metadata } from "next";

const BASE = process.env.NEXT_PUBLIC_BASE_URL || "https://finovaos.app";

export const metadata: Metadata = {
  title: "Business Finance Blog â€” Tips, Guides & Updates",
  description:
    "Expert guides on accounting, bank reconciliation, invoicing, inventory management, and business finance. Written by the Finova team for SME owners, accountants, and finance managers.",
  keywords: [
    "accounting blog",
    "business finance tips",
    "bank reconciliation guide",
    "invoicing tips SME",
    "accounting software guides",
    "small business accounting",
    "financial management blog",
    "SME finance advice",
  ],
  openGraph: {
    title: "Finova Blog â€” Business Finance & Accounting Guides",
    description:
      "Expert articles on accounting, invoicing, inventory, and business finance for SME owners and accountants.",
    url: `${BASE}/blog`,
    siteName: "Finova",
    images: [{ url: `${BASE}/icon.png`, width: 1200, height: 630, alt: "Finova Blog" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Finova Blog â€” Finance & Accounting Guides",
    description: "Expert articles on accounting, invoicing, inventory, and business finance.",
    images: [`${BASE}/icon.png`],
  },
  alternates: { canonical: `${BASE}/blog` },
};

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
