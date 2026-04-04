import type { Metadata } from "next";

const BASE = process.env.NEXT_PUBLIC_BASE_URL || "https://finovaos.app";

export const metadata: Metadata = {
  title: "Help Center — Guides, Tutorials & Documentation",
  description:
    "Step-by-step guides, video tutorials, and documentation for FinovaOS. Learn how to set up accounting, invoicing, inventory management, HR & payroll, and more for your business.",
  keywords: [
    "FinovaOS help center",
    "accounting software tutorials",
    "how to use FinovaOS",
    "accounting software documentation",
    "invoicing guide",
    "inventory setup guide",
    "payroll setup guide",
    "cloud accounting help",
  ],
  openGraph: {
    title: "FinovaOS Help Center — Guides & Documentation",
    description: "Step-by-step guides and tutorials for all FinovaOS features. Get answers fast.",
    url: `${BASE}/help`,
    siteName: "FinovaOS",
    images: [{ url: `${BASE}/icon.png`, width: 1200, height: 630, alt: "FinovaOS Help Center" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "FinovaOS Help Center",
    description: "Step-by-step guides and tutorials for all FinovaOS features.",
    images: [`${BASE}/icon.png`],
  },
  alternates: { canonical: `${BASE}/help` },
};

export default function HelpLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
