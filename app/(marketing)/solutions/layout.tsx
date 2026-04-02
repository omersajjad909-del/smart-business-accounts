import type { Metadata } from "next";

const BASE = process.env.NEXT_PUBLIC_BASE_URL || "https://finovaos.app";

export const metadata: Metadata = {
  title: "Industry Solutions â€” Trading, Manufacturing, Services & More",
  description:
    "Finova is purpose-built for traders, distributors, manufacturers, retail, and service businesses. Explore industry-specific accounting workflows, inventory systems, and financial tools designed for your sector.",
  keywords: [
    "trading business accounting software",
    "manufacturing accounting",
    "distribution management software",
    "retail accounting system",
    "service business invoicing",
    "industry-specific accounting",
    "SME business solutions",
    "wholesale accounting software",
  ],
  openGraph: {
    title: "Industry Solutions for Every Business Type | Finova",
    description:
      "Purpose-built for traders, distributors, manufacturers, and service businesses. Industry-specific workflows for better financial management.",
    url: `${BASE}/solutions`,
    siteName: "Finova",
    images: [{ url: `${BASE}/icon.png`, width: 1200, height: 630, alt: "Finova Industry Solutions" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Industry Solutions | Finova",
    description: "Trading, manufacturing, retail, and services â€” Finova adapts to your industry.",
    images: [`${BASE}/icon.png`],
  },
  alternates: { canonical: `${BASE}/solutions` },
};

export default function SolutionsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
