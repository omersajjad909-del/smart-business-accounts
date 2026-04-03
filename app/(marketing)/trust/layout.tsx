import type { Metadata } from "next";

const BASE = process.env.NEXT_PUBLIC_BASE_URL || "https://finovaos.app";

export const metadata: Metadata = {
  title: "Trust & Compliance — GDPR, Data Privacy & Certifications",
  description:
    "Finova's commitment to data privacy, GDPR compliance, financial data security, and regulatory standards. Trusted by 12,000+ businesses across 40+ countries worldwide.",
  keywords: [
    "GDPR accounting software",
    "data privacy accounting",
    "compliance accounting software",
    "trusted accounting platform",
    "secure cloud accounting",
    "financial data compliance",
    "Finova trust",
  ],
  openGraph: {
    title: "Trust & Compliance | Finova",
    description: "GDPR compliant. Data privacy first. Trusted by 12,000+ businesses worldwide.",
    url: `${BASE}/trust`,
    siteName: "Finova",
    images: [{ url: `${BASE}/icon.png`, width: 1200, height: 630, alt: "Finova Trust & Compliance" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Finova Trust & Compliance",
    description: "GDPR compliant. Data privacy first. Trusted by 12,000+ businesses.",
    images: [`${BASE}/icon.png`],
  },
  alternates: { canonical: `${BASE}/trust` },
};

export default function TrustLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
