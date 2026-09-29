import type { Metadata } from "next";

const BASE = process.env.NEXT_PUBLIC_BASE_URL || "https://www.finovaos.app";

// "use client" page (ROI calculator + animated sections) — needs its metadata
// set here, otherwise it inherits the (marketing) root layout's 311-char
// description on every field.
export const metadata: Metadata = {
  title: "Business Automation",
  description: "Automate approvals, backups, recurring invoices, and reminders with FinovaOS — fewer manual steps, fewer missed deadlines.",
  openGraph: {
    title: "Business Automation | FinovaOS",
    description: "Automate approvals, backups, recurring invoices, and reminders with FinovaOS.",
    url: `${BASE}/automation`,
    siteName: "FinovaOS",
    images: [{ url: `${BASE}/icon.png`, width: 1200, height: 630, alt: "FinovaOS Automation" }],
    type: "website",
  },
  alternates: { canonical: `${BASE}/automation` },
};

export default function AutomationLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
