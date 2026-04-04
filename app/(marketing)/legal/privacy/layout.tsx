import type { Metadata } from "next";

const BASE = process.env.NEXT_PUBLIC_BASE_URL || "https://finovaos.app";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "FinovaOS's Privacy Policy explains how we collect, use, store, and protect your personal and financial data. GDPR compliant. Last updated March 1, 2025.",
  openGraph: {
    title: "Privacy Policy | FinovaOS",
    description: "How FinovaOS collects, uses, and protects your data. GDPR compliant.",
    url: `${BASE}/legal/privacy`,
    siteName: "FinovaOS",
    type: "website",
  },
  alternates: { canonical: `${BASE}/legal/privacy` },
  robots: { index: true, follow: false },
};

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
