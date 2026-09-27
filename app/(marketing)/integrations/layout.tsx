import type { Metadata } from "next";

const BASE = process.env.NEXT_PUBLIC_BASE_URL || "https://www.finovaos.app";
const URL = `${BASE}/integrations`;

// This page had no metadata of its own, so it fell back to the marketing
// layout's site-wide default title — the same string several other pages
// used, which a crawler reported as duplicate titles.
export const metadata: Metadata = {
  title: "Integrations",
  description:
    "Connect FinovaOS to the tools your business already runs on — banking, payments, communication and more.",
  openGraph: {
    title: "Integrations — FinovaOS",
    description: "Connect FinovaOS to the tools your business already runs on.",
    url: URL,
    siteName: "FinovaOS",
    images: [{ url: `${BASE}/icon.png`, width: 1200, height: 630, alt: "FinovaOS Integrations" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Integrations — FinovaOS",
    description: "Connect FinovaOS to the tools your business already runs on.",
    images: [`${BASE}/icon.png`],
  },
  alternates: { canonical: URL },
};

export default function IntegrationsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
