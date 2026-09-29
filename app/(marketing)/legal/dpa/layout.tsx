import type { Metadata } from "next";

const BASE = process.env.NEXT_PUBLIC_BASE_URL || "https://www.finovaos.app";

export const metadata: Metadata = {
  title: "Data Processing Agreement",
  description: "FinovaOS's GDPR-compliant Data Processing Agreement between FinovaOS and its customers. Last updated 15 June 2026.",
  openGraph: {
    title: "Data Processing Agreement | FinovaOS",
    description: "FinovaOS's GDPR-compliant DPA between FinovaOS and its customers.",
    url: `${BASE}/legal/dpa`,
    siteName: "FinovaOS",
    type: "website",
  },
  alternates: { canonical: `${BASE}/legal/dpa` },
  robots: { index: true, follow: false },
};

export default function DpaLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
