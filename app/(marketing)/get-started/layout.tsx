import type { Metadata } from "next";

const BASE = process.env.NEXT_PUBLIC_BASE_URL || "https://www.finovaos.app";

export const metadata: Metadata = {
  title: "Get Started — FinovaOS",
  description: "Set up your FinovaOS account in minutes. Choose your plan, configure your company, and start managing your business finances today.",
  alternates: { canonical: `${BASE}/get-started` },
  openGraph: {
    title: "Get Started with FinovaOS",
    description: "Set up your account in minutes. Invoicing, accounting, inventory — all in one place.",
    url: `${BASE}/get-started`,
    siteName: "FinovaOS",
    images: [{ url: `${BASE}/icon.png`, width: 1200, height: 630, alt: "Get Started with FinovaOS" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Get Started with FinovaOS",
    description: "Set up in minutes. No credit card required.",
    images: [`${BASE}/icon.png`],
  },
};

export default function GetStartedLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
