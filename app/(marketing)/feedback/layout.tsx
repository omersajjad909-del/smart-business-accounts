import type { Metadata } from "next";

const BASE = process.env.NEXT_PUBLIC_BASE_URL || "https://www.finovaos.app";

// "use client" page — needs its metadata set here, otherwise it inherits the
// (marketing) root layout's 311-char description on every field.
export const metadata: Metadata = {
  title: "Send Feedback",
  description: "Report a bug, request a feature, or send a suggestion to the FinovaOS team — we read every submission.",
  openGraph: {
    title: "Send Feedback | FinovaOS",
    description: "Report a bug, request a feature, or send a suggestion to the FinovaOS team.",
    url: `${BASE}/feedback`,
    siteName: "FinovaOS",
    type: "website",
  },
  alternates: { canonical: `${BASE}/feedback` },
};

export default function FeedbackLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
