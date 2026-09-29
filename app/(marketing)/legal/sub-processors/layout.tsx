import type { Metadata } from "next";

const BASE = process.env.NEXT_PUBLIC_BASE_URL || "https://www.finovaos.app";

export const metadata: Metadata = {
  title: "Sub-processors",
  description: "Third-party services that process customer data on behalf of FinovaOS. Last updated 9 July 2026.",
  openGraph: {
    title: "Sub-processors | FinovaOS",
    description: "Third-party services that process customer data on behalf of FinovaOS.",
    url: `${BASE}/legal/sub-processors`,
    siteName: "FinovaOS",
    type: "website",
  },
  alternates: { canonical: `${BASE}/legal/sub-processors` },
  robots: { index: true, follow: false },
};

export default function SubProcessorsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
