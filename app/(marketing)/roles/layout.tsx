import type { Metadata } from "next";

const BASE = process.env.NEXT_PUBLIC_BASE_URL || "https://www.finovaos.app";

export const metadata: Metadata = {
  title: "Open Roles — FinovaOS",
  description: "Browse open positions at FinovaOS. We're hiring engineers, designers, and sales professionals across a fully remote global team.",
  alternates: { canonical: `${BASE}/roles` },
  openGraph: {
    title: "Open Roles — FinovaOS",
    description: "Browse open positions at FinovaOS. Remote-first, equity included.",
    url: `${BASE}/roles`,
    siteName: "FinovaOS",
    images: [{ url: `${BASE}/icon.png`, width: 1200, height: 630, alt: "FinovaOS Open Roles" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Open Roles — FinovaOS",
    description: "We're hiring. Remote-first, equity included.",
    images: [`${BASE}/icon.png`],
  },
};

export default function RolesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
