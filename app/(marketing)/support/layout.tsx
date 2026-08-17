import type { Metadata } from "next";

const BASE = process.env.NEXT_PUBLIC_BASE_URL || "https://www.finovaos.app";

export const metadata: Metadata = {
  title: "Support Center — FinovaOS",
  description: "Get help with FinovaOS. Browse FAQs, contact our support team, or submit a ticket. We typically respond within a few hours.",
  // No canonical here on purpose. A hardcoded canonical in a nested layout
  // applies to the whole subtree, so this one made /support/ticket declare itself
  // a duplicate of /support. The (marketing) layout already derives a per-pathname
  // canonical from x-pathname, which is correct for the parent and every child.
  openGraph: {
    title: "Support Center — FinovaOS",
    description: "Get help with FinovaOS. Browse FAQs or contact our support team.",
    url: `${BASE}/support`,
    siteName: "FinovaOS",
    images: [{ url: `${BASE}/icon.png`, width: 1200, height: 630, alt: "FinovaOS Support" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Support Center — FinovaOS",
    description: "Get help with FinovaOS. We respond within hours.",
    images: [`${BASE}/icon.png`],
  },
};

export default function SupportLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
