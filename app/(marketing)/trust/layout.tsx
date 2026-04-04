import type { Metadata } from "next";

const BASE = process.env.NEXT_PUBLIC_BASE_URL || "https://finovaos.app";

export const metadata: Metadata = {
  title: "Trust & Compliance — GDPR, Data Privacy & Certifications",
  description:
    "FinovaOS's commitment to data privacy, GDPR compliance, financial data security, and regulatory standards. Trusted by 12,000+ businesses across 40+ countries worldwide.",
  keywords: [
    "GDPR accounting software",
    "data privacy accounting",
    "compliance accounting software",
    "trusted accounting platform",
    "secure cloud accounting",
    "financial data compliance",
    "FinovaOS trust",
  ],
  openGraph: {
    title: "Trust & Compliance | FinovaOS",
    description: "GDPR compliant. Data privacy first. Trusted by 12,000+ businesses worldwide.",
    url: `${BASE}/trust`,
    siteName: "FinovaOS",
    images: [{ url: `${BASE}/icon.png`, width: 1200, height: 630, alt: "FinovaOS Trust & Compliance" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "FinovaOS Trust & Compliance",
    description: "GDPR compliant. Data privacy first. Trusted by 12,000+ businesses.",
    images: [`${BASE}/icon.png`],
  },
  alternates: { canonical: `${BASE}/trust` },
};

export default function TrustLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
