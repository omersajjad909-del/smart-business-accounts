import type { Metadata } from "next";

const BASE = process.env.NEXT_PUBLIC_BASE_URL || "https://finovaos.app";

export const metadata: Metadata = {
  title: "Enterprise-Grade Security — Data Protection & Compliance",
  description:
    "Your financial data is protected with 256-bit SSL encryption, SOC 2 compliance, two-factor authentication, automated daily backups, and role-based access control. Finova Security.",
  keywords: [
    "accounting software security",
    "financial data protection",
    "cloud accounting security",
    "SOC 2 accounting software",
    "GDPR accounting software",
    "two-factor authentication accounting",
    "encrypted accounting software",
    "secure financial management",
  ],
  openGraph: {
    title: "Enterprise-Grade Security | Finova",
    description:
      "256-bit SSL encryption, SOC 2 compliance, 2FA, automated backups, and role-based access. Your financial data is always safe.",
    url: `${BASE}/security`,
    siteName: "Finova",
    images: [{ url: `${BASE}/icon.png`, width: 1200, height: 630, alt: "Finova Security" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Finova Security — Enterprise-Grade Protection",
    description: "256-bit SSL, SOC 2, 2FA, daily backups. Your data is safe with Finova.",
    images: [`${BASE}/icon.png`],
  },
  alternates: { canonical: `${BASE}/security` },
};

export default function SecurityLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
