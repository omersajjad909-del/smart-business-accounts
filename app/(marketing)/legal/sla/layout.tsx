import type { Metadata } from "next";

const BASE = process.env.NEXT_PUBLIC_BASE_URL || "https://www.finovaos.app";

export const metadata: Metadata = {
  title: "Service Level Agreement",
  description: "FinovaOS's Service Level Agreement — uptime, backups, and support commitments for paid plans. Last updated 15 June 2026.",
  openGraph: {
    title: "Service Level Agreement | FinovaOS",
    description: "Uptime, backups, and support commitments for FinovaOS paid plans.",
    url: `${BASE}/legal/sla`,
    siteName: "FinovaOS",
    type: "website",
  },
  alternates: { canonical: `${BASE}/legal/sla` },
  robots: { index: true, follow: false },
};

export default function SlaLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
