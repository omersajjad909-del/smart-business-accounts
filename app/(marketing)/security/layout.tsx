import type { Metadata } from "next";

const BASE = process.env.NEXT_PUBLIC_BASE_URL || "https://www.finovaos.app";

export const metadata: Metadata = {
  title: "Enterprise-Grade Security — Data Protection & Compliance",
  // SOC 2 removed from every field below — the page body itself says SOC 2
  // is "on our roadmap," not obtained. Claiming it in metadata is exactly the
  // kind of checkable claim that gets a site distrusted once a reader or an
  // AI answer engine cross-references the actual page.
  description:
    "Your financial data is protected with 256-bit SSL encryption, two-factor authentication, automated daily backups, and role-based access control. FinovaOS Security.",
  keywords: [
    "accounting software security",
    "financial data protection",
    "cloud accounting security",
    "GDPR accounting software",
    "two-factor authentication accounting",
    "encrypted accounting software",
    "secure financial management",
  ],
  openGraph: {
    title: "Enterprise-Grade Security | FinovaOS",
    description:
      "256-bit SSL encryption, 2FA, automated backups, and role-based access. Your financial data is always safe.",
    url: `${BASE}/security`,
    siteName: "FinovaOS",
    images: [{ url: `${BASE}/icon.png`, width: 1200, height: 630, alt: "FinovaOS Security" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "FinovaOS Security — Enterprise-Grade Protection",
    description: "256-bit SSL, 2FA, daily backups. Your data is safe with FinovaOS.",
    images: [`${BASE}/icon.png`],
  },
  alternates: { canonical: `${BASE}/security` },
};

export default function SecurityLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
