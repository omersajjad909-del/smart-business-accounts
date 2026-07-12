import type { Metadata } from "next";

const BASE = process.env.NEXT_PUBLIC_BASE_URL || "https://www.finovaos.app";

export const metadata: Metadata = {
  title: "Join the Waitlist",
  description:
    "Join the FinovaOS early access waitlist to get launch updates, product news, and priority onboarding for your business.",
  alternates: { canonical: `${BASE}/waitlist` },
  openGraph: {
    title: "Join the Waitlist | FinovaOS",
    description:
      "Be among the first to experience FinovaOS. Join the early access waitlist for launch updates and priority onboarding.",
    url: `${BASE}/waitlist`,
    siteName: "FinovaOS",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Join the Waitlist | FinovaOS",
    description:
      "Join the FinovaOS early access waitlist for launch updates and priority onboarding.",
  },
};

export default function WaitlistLayout({ children }: { children: React.ReactNode }) {
  return children;
}
