import type { Metadata } from "next";

const BASE = process.env.NEXT_PUBLIC_BASE_URL || "https://www.finovaos.app";

export const metadata: Metadata = {
  title: "API & Developer Documentation — FinovaOS",
  description: "Integrate FinovaOS with your systems using the REST API. Endpoints for invoices, contacts, inventory, and payments. API keys available on Enterprise plan.",
  keywords: ["FinovaOS API", "accounting API", "invoice API", "REST API accounting", "developer documentation"],
  alternates: { canonical: `${BASE}/developers/api` },
  openGraph: {
    title: "API & Developer Docs — FinovaOS",
    description: "Integrate FinovaOS with your systems. REST API for invoices, contacts, inventory, and payments.",
    url: `${BASE}/developers/api`,
    siteName: "FinovaOS",
    images: [{ url: `${BASE}/icon.png`, width: 1200, height: 630, alt: "FinovaOS Developer API" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "FinovaOS Developer API",
    description: "REST API for invoices, contacts, inventory, and payments.",
    images: [`${BASE}/icon.png`],
  },
};

export default function ApiLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
